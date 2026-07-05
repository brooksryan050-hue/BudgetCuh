import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { CurrencyPicker } from '@/components/ui/currency-picker';
import { HourPicker } from '@/components/ui/hour-picker';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { BadgeCard } from '@/components/challenges/badge-card';
import { getCurrencyByCode } from '@/data/currencies';
import { getLevelCharacter } from '@/data/level-characters';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { signOutUser } from '@/lib/auth';
import { ensureDailyReminderScheduled, formatReminderHour } from '@/lib/notifications-native';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';
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
  const { level, points } = useLevel();
  const streaks = useStreaks(new Date());
  const character = getLevelCharacter(level);
  const currencySymbol = getCurrencyByCode(profile?.currency ?? 'USD')?.symbol ?? profile?.currency ?? '$';

  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState(profile ? `${profile.monthlyIncome}` : '');
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [requestingPush, setRequestingPush] = useState(false);
  const [pushSetupError, setPushSetupError] = useState<string | null>(null);

  const [badgeGridWidth, setBadgeGridWidth] = useState(0);
  const badgeColumns = badgeGridWidth > 0 ? Math.max(1, Math.floor((badgeGridWidth + BADGE_GAP) / (BADGE_MIN_WIDTH + BADGE_GAP))) : 0;
  const badgeItemWidth = badgeColumns > 0 ? (badgeGridWidth - BADGE_GAP * (badgeColumns - 1)) / badgeColumns : BADGE_MIN_WIDTH;

  const [editingSavingsTarget, setEditingSavingsTarget] = useState(false);
  const [savingsAmountInput, setSavingsAmountInput] = useState('');
  const [savingsCadenceInput, setSavingsCadenceInput] = useState<'weekly' | 'monthly'>('weekly');
  const [savingsError, setSavingsError] = useState<string | null>(null);

  function saveIncome() {
    const parsed = parseFloat(incomeInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setIncomeError('Enter an amount greater than 0.');
      return;
    }
    updateProfile({ monthlyIncome: parsed });
    setIncomeError(null);
    setEditingIncome(false);
  }

  function openEditSavingsTarget() {
    setSavingsAmountInput(profile ? `${profile.savingsGoalAmount}` : '');
    setSavingsCadenceInput(profile?.savingsGoalCadence ?? 'weekly');
    setSavingsError(null);
    setEditingSavingsTarget(true);
  }

  function saveSavingsTarget() {
    const parsed = parseFloat(savingsAmountInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSavingsError('Enter an amount greater than 0.');
      return;
    }
    updateProfile({ savingsGoalAmount: parsed, savingsGoalCadence: savingsCadenceInput });
    setSavingsError(null);
    setEditingSavingsTarget(false);
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

  const earnedBadges = useMemo(() => badges.filter((b) => b.earnedAt !== null), [badges]);
  const earnedCount = earnedBadges.length;

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
                : badges.map((badge) => (
                    <View
                      key={badge.key}
                      style={[
                        styles.badgeSkeleton,
                        { backgroundColor: theme.backgroundElement, marginRight: BADGE_GAP },
                      ]}
                    />
                  ))}
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
                    onChangeText={(text) => {
                      setIncomeInput(text);
                      if (incomeError) setIncomeError(null);
                    }}
                    keyboardType="decimal-pad"
                    autoFocus
                    onBlur={saveIncome}
                    onSubmitEditing={saveIncome}
                  />
                ) : (
                  <Pressable
                    onPress={() => {
                      setIncomeError(null);
                      setEditingIncome(true);
                    }}>
                    <ThemedText type="smallBold" style={{ color: theme.brand }}>
                      {currencySymbol}
                      {profile?.monthlyIncome} · Edit
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              {incomeError ? (
                <ThemedText type="small" themeColor="danger" style={styles.pushErrorText}>
                  {incomeError}
                </ThemedText>
              ) : null}
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

          <Pressable
            style={[styles.resetButton, { backgroundColor: theme.backgroundElement }]}
            onPress={() => signOutUser()}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Sign out
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

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
              onChangeText={(text) => {
                setSavingsAmountInput(text);
                if (savingsError) setSavingsError(null);
              }}
              keyboardType="decimal-pad"
              autoFocus
            />
            {savingsError ? (
              <ThemedText type="small" themeColor="danger">
                {savingsError}
              </ThemedText>
            ) : null}
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
  badgeSkeleton: {
    width: BADGE_MIN_WIDTH,
    height: 88,
    borderRadius: Radius.md,
    marginBottom: Spacing.three,
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
