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
import { ensureDailyReminderScheduled, formatReminderHour } from '@/lib/notifications-native';
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
  const { level, points } = useLevel();
  const streaks = useStreaks(new Date());
  const character = getLevelCharacter(level);
  const currencySymbol = getCurrencyByCode(profile?.currency ?? 'USD')?.symbol ?? profile?.currency ?? '$';

  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState(profile ? `${profile.monthlyIncome}` : '');
  const [confirmResetVisible, setConfirmResetVisible] = useState(false);
  const [devModeEnabled, setDevModeEnabled] = useState(false);

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
                </>
              ) : null}
            </Card>
          </View>

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
