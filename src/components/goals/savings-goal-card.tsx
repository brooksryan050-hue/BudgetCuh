import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Radius, Spacing } from '@/constants/theme';
import { fromISODate, formatShortDate, daysBetween } from '@/lib/dates';
import { getCurrencyFormatter } from '@/lib/currency';
import { useTheme } from '@/hooks/use-theme';
import type { SavingsGoal } from '@/types';

function statusMessage(goal: SavingsGoal): string {
  const pct = (goal.currentAmount / goal.targetAmount) * 100;
  if (pct >= 100) return "Goal reached! Time to celebrate.";
  if (pct >= 75) return "You're close to your goal. Keep going.";
  if (pct >= 25) return 'Nice progress — small savings add up.';
  return 'Every contribution counts. Get started.';
}

function suggestedWeeklyAmount(goal: SavingsGoal): number | null {
  if (!goal.deadline) return null;
  const weeksLeft = Math.max(1, Math.ceil(daysBetween(new Date(), fromISODate(goal.deadline)) / 7));
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  return remaining / weeksLeft;
}

export function SavingsGoalCard({
  goal,
  currency,
  onPress,
  onEdit,
  style,
}: {
  goal: SavingsGoal;
  currency: string;
  onPress?: () => void;
  onEdit?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const formatter = getCurrencyFormatter(currency, 0);
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const suggested = suggestedWeeklyAmount(goal);

  return (
    <Card onPress={onPress} style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: theme.successBackground }]}>
          <Ionicons name={goal.icon as keyof typeof Ionicons.glyphMap} size={20} color={theme.success} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{goal.name}</ThemedText>
          {goal.deadline ? (
            <ThemedText type="small" themeColor="textSecondary">
              By {formatShortDate(fromISODate(goal.deadline))}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText type="smallBold">{Math.round(pct)}%</ThemedText>
        {onEdit ? (
          <Pressable hitSlop={8} onPress={onEdit} style={styles.editButton}>
            <Ionicons name="pencil" size={14} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <ProgressBar progress={pct} color={theme.success} />

      <View style={styles.amountRow}>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {formatter.format(goal.currentAmount)} of {formatter.format(goal.targetAmount)}
        </ThemedText>
        {suggested ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            ~{formatter.format(suggested)}/wk to reach it
          </ThemedText>
        ) : null}
      </View>

      <ThemedText type="small" numberOfLines={1} style={{ color: theme.success }}>
        {statusMessage(goal)}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    paddingLeft: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  amountRow: {
    gap: 2,
  },
});
