import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { ProgressRing } from '@/components/ui/progress-ring';
import { ConfettiBurst } from '@/components/ui/confetti-burst';
import { getChallengeTemplateById } from '@/data/challenge-templates';
import { getBadgeCatalogEntry } from '@/data/badges';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { computeChallengeProgress } from '@/lib/challenges';
import { fromISODate, formatFullDate, toISODate } from '@/lib/dates';
import { playChallengeCompleteSound } from '@/lib/sound';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/budget-store';

const DIFFICULTY_COLOR = { easy: '#1FAA59', medium: '#F5A623', hard: '#E5484D' } as const;

export default function ChallengeDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const referenceDate = useMemo(() => new Date(), []);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  const challenges = useBudgetStore((s) => s.challenges);
  const transactions = useBudgetStore((s) => s.transactions);
  const claimChallengeReward = useBudgetStore((s) => s.claimChallengeReward);
  const recordChallengeCheckIn = useBudgetStore((s) => s.recordChallengeCheckIn);

  const instance = challenges.find((c) => c.id === params.id);
  const template = instance ? getChallengeTemplateById(instance.templateId) : undefined;

  if (!instance || !template) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText>Challenge not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const progress = computeChallengeProgress(instance, template, transactions, referenceDate);
  const badge = template.badgeKey ? getBadgeCatalogEntry(template.badgeKey) : null;
  const canClaim = instance.status === 'active' && progress.isComplete;
  const isCompleted = instance.status === 'completed';

  // These target types can't be derived from transaction data at all (e.g. "cook at
  // home 4 times" has no natural spending signature) — progress only ever moves via a
  // manual check-in, so this screen needs to actually expose that action.
  const isCheckInType = template.targetType === 'streak_days' || template.targetType === 'count_actions';
  const todayISO = toISODate(referenceDate);
  const alreadyCheckedInToday = instance.checkIns.includes(todayISO);

  function handleClaim() {
    claimChallengeReward(instance!.id);
    setConfettiTrigger((n) => n + 1);
    playChallengeCompleteSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  function handleCheckIn() {
    recordChallengeCheckIn(instance!.id, todayISO);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">Challenge</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.titleRow}>
            <Pill
              label={template.difficulty}
              selected
              color={DIFFICULTY_COLOR[template.difficulty]}
            />
            <ThemedText type="title" style={styles.title}>
              {template.title}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              {template.description}
            </ThemedText>
          </View>

          <Card style={styles.progressCard}>
            <ProgressRing
              progress={progress.pctComplete}
              size={120}
              strokeWidth={12}
              color={isCompleted ? theme.success : theme.brand}>
              <ThemedText type="subtitle">{Math.round(progress.pctComplete)}%</ThemedText>
            </ProgressRing>
            <ThemedText type="small" themeColor="textSecondary" style={styles.deadline}>
              {isCompleted ? 'Completed' : `Ends ${formatFullDate(fromISODate(instance.endDate))}`}
            </ThemedText>
          </Card>

          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Reward
              </ThemedText>
              <ThemedText type="smallBold">{template.points} points</ThemedText>
            </View>
            {badge ? (
              <View style={styles.infoRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Badge
                </ThemedText>
                <ThemedText type="smallBold">{badge.name}</ThemedText>
              </View>
            ) : null}
          </Card>

          {isCompleted ? (
            <Card style={[styles.motivationCard, { backgroundColor: theme.successBackground }]}>
              <Ionicons name="trophy" size={22} color={theme.success} />
              <ThemedText type="smallBold" style={{ color: theme.success }}>
                Nice work — challenge complete! Small savings add up.
              </ThemedText>
            </Card>
          ) : canClaim ? (
            <Pressable style={[styles.claimButton, { backgroundColor: theme.brand }]} onPress={handleClaim}>
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                Claim reward
              </ThemedText>
            </Pressable>
          ) : isCheckInType ? (
            <View style={styles.checkInSection}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                {progress.progressValue} of {template.targetValue} check-ins logged
              </ThemedText>
              <Pressable
                disabled={alreadyCheckedInToday}
                onPress={handleCheckIn}
                style={[
                  styles.claimButton,
                  { backgroundColor: alreadyCheckedInToday ? theme.backgroundElement : theme.brand },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: alreadyCheckedInToday ? theme.textSecondary : '#ffffff' }}>
                  {alreadyCheckedInToday ? 'Checked in today ✓' : 'Check in for today'}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Keep going — your progress updates automatically as you log transactions.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
      <ConfettiBurst trigger={confettiTrigger} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  titleRow: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  progressCard: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  deadline: {
    textAlign: 'center',
  },
  infoCard: {
    gap: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  claimButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
  },
  checkInSection: {
    gap: Spacing.two,
  },
  hint: {
    textAlign: 'center',
  },
});
