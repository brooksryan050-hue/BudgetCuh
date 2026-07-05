import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CurrencyPicker } from '@/components/ui/currency-picker';
import { HourPicker } from '@/components/ui/hour-picker';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { BadgeCard } from '@/components/challenges/badge-card';
import { getCurrencyByCode } from '@/data/currencies';
import { getLevelCharacter, LEVEL_CHARACTERS } from '@/data/level-characters';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { pointsForLevel } from '@/lib/gamification';
import { signOutUser } from '@/lib/auth';
import { getOrGenerateTodaysNudge, testGenerateReflection } from '@/lib/ai-content';
import { ensureDailyReminderScheduled, formatReminderHour, scheduleOneOffNotification } from '@/lib/notifications-native';
import { showSimulatedNotification } from '@/lib/notification-toast';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';
import type { SimScenario } from '@/lib/simulate-scenario';
import { useLevel } from '@/hooks/use-level';
import { useStreaks } from '@/hooks/use-streaks';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/budget-store';

const BADGE_MIN_WIDTH = 84;
const BADGE_GAP = Spacing.three;

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useBudgetStore((s) => s.profile);
  const badges = useBudgetStore((s) => s.badges);
  const updateProfile = useBudgetStore((s) => s.updateProfile);
  const resetAllData = useBudgetStore((s) => s.resetAllData);
  const devSetPoints = useBudgetStore((s) => s.devSetPoints);
  const loadSimulatedScenario = useBudgetStore((s) => s.loadSimulatedScenario);
  const devCompleteAllChallenges = useBudgetStore((s) => s.devCompleteAllChallenges);
  const { level, points } = useLevel();
  const streaks = useStreaks(new Date());
  const character = getLevelCharacter(level);
  const currencySymbol = getCurrencyByCode(profile?.currency ?? 'USD')?.symbol ?? profile?.currency ?? '$';

  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState(profile ? `${profile.monthlyIncome}` : '');
  const [confirmResetVisible, setConfirmResetVisible] = useState(false);
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<string | null>(null);
  const [aiTestBusy, setAiTestBusy] = useState(false);
  const [pendingScenario, setPendingScenario] = useState<SimScenario | null>(null);
  const [scenarioStatus, setScenarioStatus] = useState<string | null>(null);
  const [requestingPush, setRequestingPush] = useState(false);
  const [pushSetupError, setPushSetupError] = useState<string | null>(null);

  const [badgeGridWidth, setBadgeGridWidth] = useState(0);
  const badgeColumns = badgeGridWidth > 0 ? Math.max(1, Math.floor((badgeGridWidth + BADGE_GAP) / (BADGE_MIN_WIDTH + BADGE_GAP))) : 0;
  const badgeItemWidth = badgeColumns > 0 ? (badgeGridWidth - BADGE_GAP * (badgeColumns - 1)) / badgeColumns : BADGE_MIN_WIDTH;

  const [editingSavingsTarget, setEditingSavingsTarget] = useState(false);
  const [savingsAmountInput, setSavingsAmountInput] = useState('');
  const [savingsCadenceInput, setSavingsCadenceInput] = useState<'weekly' | 'monthly'>('weekly');

  function saveIncome() {
    const parsed = parseFloat(incomeInput);
    if (Number.isFinite(parsed) && parsed > 0) {
      updateProfile({ monthlyIncome: parsed });
    }
    setEditingIncome(false);
  }

  function openEditSavingsTarget() {
    setSavingsAmountInput(profile ? `${profile.savingsGoalAmount}` : '');
    setSavingsCadenceInput(profile?.savingsGoalCadence ?? 'weekly');
    setEditingSavingsTarget(true);
  }

  function saveSavingsTarget() {
    const parsed = parseFloat(savingsAmountInput);
    if (Number.isFinite(parsed) && parsed > 0) {
      updateProfile({ savingsGoalAmount: parsed, savingsGoalCadence: savingsCadenceInput });
    }
    setEditingSavingsTarget(false);
  }

  function handleReset() {
    resetAllData();
    setConfirmResetVisible(false);
    router.replace('/onboarding');
  }

  const reminderHour = profile?.dailyReminderHour ?? 18;

  function toggleDailyReminder(enabled: boolean) {
    updateProfile({ dailyReminderEnabled: enabled });
    ensureDailyReminderScheduled(enabled, reminderHour);
  }

  function changeReminderHour(hour: number) {
    updateProfile({ dailyReminderHour: hour });
    if (profile?.dailyReminderEnabled) {
      ensureDailyReminderScheduled(true, hour);
    }
  }

  async function togglePushNotifications(enabled: boolean) {
    if (!enabled) {
      updateProfile({ pushNotificationsEnabled: false });
      setPushSetupError(null);
      return;
    }
    setRequestingPush(true);
    setPushSetupError(null);
    const token = await registerForPushNotificationsAsync();
    setRequestingPush(false);
    if (token) {
      updateProfile({ pushNotificationsEnabled: true, expoPushToken: token });
    } else {
      // Permission denied, running on web/simulator, or no EAS project id yet —
      // leave the toggle off rather than claiming a state we can't deliver on, but
      // say why instead of silently doing nothing.
      setPushSetupError("Couldn't turn this on, check notification permissions, or ask your developer to finish push setup.");
    }
  }

  async function testRegenerateNudge() {
    setAiTestBusy(true);
    setAiTestStatus(null);
    try {
      const nudge = await getOrGenerateTodaysNudge({ force: true });
      showSimulatedNotification({
        title: nudge.title,
        message: nudge.message,
        onPress: () => router.push('/coach'),
      });
    } catch (error) {
      setAiTestStatus(error instanceof Error ? error.message : "Couldn't regenerate the nudge, check the function logs.");
    } finally {
      setAiTestBusy(false);
    }
  }

  async function testReflection(periodType: 'weekly' | 'monthly') {
    setAiTestBusy(true);
    setAiTestStatus(null);
    try {
      await testGenerateReflection(periodType);
      router.push('/reflection');
    } catch (error) {
      setAiTestStatus(error instanceof Error ? error.message : `Couldn't generate the ${periodType} reflection.`);
    } finally {
      setAiTestBusy(false);
    }
  }

  function confirmLoadScenario() {
    if (!pendingScenario) return;
    loadSimulatedScenario(pendingScenario);
    setScenarioStatus(
      pendingScenario === 'high_saver'
        ? '30 days of high-savings history loaded. Try "Regenerate today\'s nudge" or a reflection test below.'
        : '30 days of high-spending history loaded. Try "Regenerate today\'s nudge" or a reflection test below.'
    );
    setPendingScenario(null);
  }

  function completeAllChallenges() {
    devCompleteAllChallenges();
    setScenarioStatus('All challenges marked complete. Points, badges, and completion notifications should reflect it now.');
  }

  async function sendTestNotification() {
    const target = new Date();
    target.setHours(18, 30, 0, 0);
    // If 6:30pm already passed by the time this got tapped, fire it in 10 seconds
    // instead of waiting until tomorrow — the point is testing, not the exact time.
    const alreadyPassed = target.getTime() <= Date.now();
    if (alreadyPassed) target.setTime(Date.now() + 10_000);
    const ok = await scheduleOneOffNotification('Test', 'test', target);
    setScenarioStatus(
      ok
        ? alreadyPassed
          ? '6:30pm already passed, so this will fire in about 10 seconds instead. Lock your phone and wait for it.'
          : `Scheduled for ${target.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} today. Lock your phone and wait for it.`
        : "Couldn't schedule it, check notification permissions."
    );
  }

  const earnedCount = badges.filter((b) => b.earnedAt !== null).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>
            Profile
          </ThemedText>

          <Card style={styles.profileCard}>
            <View style={[styles.avatar, { backgroundColor: theme.brandSecondary + '26' }]}>
              <ThemedText style={styles.avatarEmoji}>{character.emoji}</ThemedText>
            </View>
            <View style={styles.profileText}>
              <ThemedText type="subtitle">{profile?.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {character.name} · Level {level} · {points} points
              </ThemedText>
            </View>
          </Card>

          <Card style={styles.statsCard}>
            <View style={styles.statRow}>
              <Ionicons name="flame" size={18} color={theme.warning} />
              <ThemedText type="small">Daily discipline streak</ThemedText>
              <ThemedText type="smallBold" style={styles.statValue}>
                {streaks.dailyDisciplineStreak} days
              </ThemedText>
            </View>
            <View style={styles.statRow}>
              <Ionicons name="trending-up" size={18} color={theme.success} />
              <ThemedText type="small">Saving week streak</ThemedText>
              <ThemedText type="smallBold" style={styles.statValue}>
                {streaks.savingWeekStreak} weeks
              </ThemedText>
            </View>
          </Card>

          <View>
            <SectionHeader title={`Badges (${earnedCount}/${badges.length})`} />
            <View style={styles.badgeGrid} onLayout={(e) => setBadgeGridWidth(e.nativeEvent.layout.width)}>
              {badgeGridWidth > 0
                ? badges.map((badge, index) => {
                    const isLastInRow = (index + 1) % badgeColumns === 0;
                    return (
                      <BadgeCard
                        key={badge.key}
                        badge={badge}
                        style={{ width: badgeItemWidth, marginRight: isLastInRow ? 0 : BADGE_GAP }}
                      />
                    );
                  })
                : null}
            </View>
          </View>

          <View>
            <SectionHeader title="Account" />
            <Card style={styles.settingsCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Currency
              </ThemedText>
              <CurrencyPicker
                value={profile?.currency ?? 'USD'}
                onChange={(currency) => updateProfile({ currency })}
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.settingRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Monthly income
                </ThemedText>
                {editingIncome ? (
                  <TextInput
                    style={[styles.incomeInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                    value={incomeInput}
                    onChangeText={setIncomeInput}
                    keyboardType="decimal-pad"
                    autoFocus
                    onBlur={saveIncome}
                    onSubmitEditing={saveIncome}
                  />
                ) : (
                  <Pressable onPress={() => setEditingIncome(true)}>
                    <ThemedText type="smallBold" style={{ color: theme.brand }}>
                      {currencySymbol}
                      {profile?.monthlyIncome} · Edit
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.settingRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Savings goal
                </ThemedText>
                <Pressable onPress={openEditSavingsTarget}>
                  <ThemedText type="smallBold" style={{ color: theme.brand }}>
                    {currencySymbol}
                    {profile?.savingsGoalAmount} / {profile?.savingsGoalCadence} · Edit
                  </ThemedText>
                </Pressable>
              </View>
            </Card>
          </View>

          <View>
            <SectionHeader title="Notifications" />
            <Card style={styles.notificationsCard}>
              <Pressable
                style={styles.settingRow}
                onPress={() => toggleDailyReminder(!(profile?.dailyReminderEnabled ?? false))}>
                <View style={styles.notificationLabel}>
                  <ThemedText type="default">Daily reminder at {formatReminderHour(reminderHour)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    A local nudge to log today&apos;s spending.
                  </ThemedText>
                </View>
                <Switch value={profile?.dailyReminderEnabled ?? false} pointerEvents="none" />
              </Pressable>
              {profile?.dailyReminderEnabled ? (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <View style={styles.settingRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Remind me at
                    </ThemedText>
                    <HourPicker value={reminderHour} onChange={changeReminderHour} />
                  </View>
                </>
              ) : null}
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Pressable
                style={styles.settingRow}
                disabled={requestingPush}
                onPress={() => togglePushNotifications(!(profile?.pushNotificationsEnabled ?? false))}>
                <View style={styles.notificationLabel}>
                  <ThemedText type="default">Coaching push notifications</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {requestingPush ? 'Requesting permission…' : 'Get a push when your daily tip is ready.'}
                  </ThemedText>
                </View>
                <Switch value={profile?.pushNotificationsEnabled ?? false} pointerEvents="none" />
              </Pressable>
              {pushSetupError ? (
                <ThemedText type="small" themeColor="danger" style={styles.pushErrorText}>
                  {pushSetupError}
                </ThemedText>
              ) : null}
            </Card>
          </View>

          <Card>
            <View style={styles.statRow}>
              <ProgressBar progress={earnedCount === 0 ? 0 : (earnedCount / badges.length) * 100} color={theme.success} />
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.progressCaption}>
              You&apos;ve earned {earnedCount} of {badges.length} badges. Keep going.
            </ThemedText>
          </Card>

          {__DEV__ ? (
          <View>
            <SectionHeader title="Developer options" />
            <Card style={styles.devCard}>
              <Pressable style={styles.settingRow} onPress={() => setDevModeEnabled((v) => !v)}>
                <ThemedText type="default">Developer mode</ThemedText>
                <Switch value={devModeEnabled} pointerEvents="none" />
              </Pressable>
              {devModeEnabled ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    Jump to a level to preview its character unlock instantly.
                  </ThemedText>
                  <View style={styles.levelJumpGrid}>
                    {LEVEL_CHARACTERS.map((lc) => (
                      <Pressable
                        key={lc.level}
                        onPress={() => devSetPoints(pointsForLevel(lc.level))}
                        style={[
                          styles.levelJumpTile,
                          { backgroundColor: theme.backgroundElement },
                          level === lc.level && { backgroundColor: theme.backgroundSelected },
                        ]}>
                        <ThemedText style={styles.levelJumpEmoji}>{lc.emoji}</ThemedText>
                        <ThemedText type="small">Lv {lc.level}</ThemedText>
                      </Pressable>
                    ))}
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <ThemedText type="small" themeColor="textSecondary">
                    No real usage yet? Load 30 days of simulated transaction history so the nudge/reflection tests below
                    have real, data-verifiable extremes to react to instead of an empty account.
                  </ThemedText>
                  <View style={styles.testButtonRow}>
                    <Pressable
                      style={[styles.testButton, styles.testButtonHalf, { backgroundColor: theme.backgroundElement }]}
                      onPress={() => setPendingScenario('high_saver')}>
                      <ThemedText type="smallBold" style={{ color: theme.success }}>
                        💰 High saver
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={[styles.testButton, styles.testButtonHalf, { backgroundColor: theme.backgroundElement }]}
                      onPress={() => setPendingScenario('high_spender')}>
                      <ThemedText type="smallBold" style={{ color: theme.danger }}>
                        🛍️ High spender
                      </ThemedText>
                    </Pressable>
                  </View>
                  <Pressable
                    style={[styles.testButton, { backgroundColor: theme.backgroundElement }]}
                    onPress={completeAllChallenges}>
                    <Ionicons name="trophy" size={16} color={theme.brandSecondary} />
                    <ThemedText type="smallBold" style={{ color: theme.brandSecondary }}>
                      Mark all challenges complete
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.testButton, { backgroundColor: theme.backgroundElement }]}
                    onPress={sendTestNotification}>
                    <Ionicons name="notifications" size={16} color={theme.brand} />
                    <ThemedText type="smallBold" style={{ color: theme.brand }}>
                      Send test notification (6:30pm)
                    </ThemedText>
                  </Pressable>
                  {scenarioStatus ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {scenarioStatus}
                    </ThemedText>
                  ) : null}

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Force-regenerate AI content from your current transactions, instead of waiting on the daily/weekly
                    cron. Reflections use the week/month still in progress, not the last completed one. Nudge regeneration
                    shows a simulated push banner (real push doesn&apos;t work in a browser).
                  </ThemedText>
                  <Pressable
                    style={[styles.testButton, { backgroundColor: theme.backgroundElement }]}
                    onPress={() =>
                      showSimulatedNotification({
                        title: '🔔 Preview banner',
                        message: "If you can see this, the toast itself works fine, no AI call involved.",
                      })
                    }>
                    <Ionicons name="eye" size={16} color={theme.textSecondary} />
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Preview toast banner (no AI call)
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    disabled={aiTestBusy}
                    style={[styles.testButton, { backgroundColor: theme.backgroundElement }, aiTestBusy && styles.buttonDisabled]}
                    onPress={testRegenerateNudge}>
                    <Ionicons name="refresh" size={16} color={theme.brand} />
                    <ThemedText type="smallBold" style={{ color: theme.brand }}>
                      Regenerate today&apos;s nudge
                    </ThemedText>
                  </Pressable>
                  <View style={styles.testButtonRow}>
                    <Pressable
                      disabled={aiTestBusy}
                      style={[
                        styles.testButton,
                        styles.testButtonHalf,
                        { backgroundColor: theme.backgroundElement },
                        aiTestBusy && styles.buttonDisabled,
                      ]}
                      onPress={() => testReflection('weekly')}>
                      <Ionicons name="refresh" size={16} color={theme.brandSecondary} />
                      <ThemedText type="smallBold" style={{ color: theme.brandSecondary }}>
                        Test weekly reflection
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      disabled={aiTestBusy}
                      style={[
                        styles.testButton,
                        styles.testButtonHalf,
                        { backgroundColor: theme.backgroundElement },
                        aiTestBusy && styles.buttonDisabled,
                      ]}
                      onPress={() => testReflection('monthly')}>
                      <Ionicons name="refresh" size={16} color={theme.brandSecondary} />
                      <ThemedText type="smallBold" style={{ color: theme.brandSecondary }}>
                        Test monthly reflection
                      </ThemedText>
                    </Pressable>
                  </View>
                  {aiTestBusy ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Generating…
                    </ThemedText>
                  ) : aiTestStatus ? (
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      {aiTestStatus}
                    </ThemedText>
                  ) : null}
                </>
              ) : null}
            </Card>
          </View>
          ) : null}

          <Pressable
            style={[styles.resetButton, { backgroundColor: theme.dangerBackground }]}
            onPress={() => setConfirmResetVisible(true)}>
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              Reset demo data
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.resetButton, { backgroundColor: theme.backgroundElement }]}
            onPress={() => signOutUser()}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Sign out
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <ConfirmDialog
        visible={confirmResetVisible}
        title="Reset all data?"
        message="This clears your transactions, budgets, challenges, and goals, and restarts onboarding."
        confirmLabel="Reset"
        destructive
        onConfirm={handleReset}
        onCancel={() => setConfirmResetVisible(false)}
      />

      <ConfirmDialog
        visible={pendingScenario !== null}
        title={`Load ${pendingScenario === 'high_saver' ? 'high saver' : 'high spender'} scenario?`}
        message="This replaces any previously-loaded simulated history with a fresh 30-day run. Your real transactions (if any) aren't touched."
        confirmLabel="Load scenario"
        destructive
        onConfirm={confirmLoadScenario}
        onCancel={() => setPendingScenario(null)}
      />

      <Modal
        visible={editingSavingsTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSavingsTarget(false)}>
        <Pressable
          style={[styles.overlay, { backgroundColor: theme.overlay }]}
          onPress={() => setEditingSavingsTarget(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle">Edit savings goal</ThemedText>
            <ThemedText type="smallBold" style={styles.sheetFieldLabel}>
              Amount
            </ThemedText>
            <TextInput
              style={[styles.sheetInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              value={savingsAmountInput}
              onChangeText={setSavingsAmountInput}
              keyboardType="decimal-pad"
              autoFocus
            />
            <ThemedText type="smallBold" style={styles.sheetFieldLabel}>
              Cadence
            </ThemedText>
            <View style={styles.cadenceRow}>
              <Pill
                label="Weekly"
                selected={savingsCadenceInput === 'weekly'}
                onPress={() => setSavingsCadenceInput('weekly')}
              />
              <Pill
                label="Monthly"
                selected={savingsCadenceInput === 'monthly'}
                onPress={() => setSavingsCadenceInput('monthly')}
              />
            </View>
            <Pressable style={[styles.sheetButton, { backgroundColor: theme.brand }]} onPress={saveSavingsTarget}>
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                Save
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%' },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  profileText: {
    gap: 2,
  },
  notificationLabel: {
    flex: 1,
    gap: 2,
  },
  devCard: {
    gap: Spacing.two,
  },
  levelJumpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  levelJumpTile: {
    width: 64,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    marginRight: Spacing.two,
    marginBottom: Spacing.two,
  },
  levelJumpEmoji: {
    fontSize: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  testButtonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  testButtonHalf: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  statsCard: {
    gap: Spacing.two,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statValue: {
    marginLeft: 'auto',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  settingsCard: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  notificationsCard: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  pushErrorText: {
    marginTop: -Spacing.one,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  incomeInput: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    minWidth: 100,
    textAlign: 'right',
  },
  progressCaption: {
    marginTop: Spacing.one,
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  sheetFieldLabel: {
    marginTop: Spacing.one,
  },
  sheetInput: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  cadenceRow: {
    flexDirection: 'row',
  },
  sheetButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
});
