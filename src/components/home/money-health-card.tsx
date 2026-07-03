import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MoneyHealthBreakdown } from '@/types';

const LABEL_COPY: Record<MoneyHealthBreakdown['label'], string> = {
  Excellent: "You're in great shape. Keep it up.",
  Good: 'Solid progress — small tweaks will push you further.',
  Fair: "You're on your way. Try one challenge this week.",
  'Needs attention': 'Every week is a fresh start. Small savings add up.',
};

export function MoneyHealthCard({ breakdown }: { breakdown: MoneyHealthBreakdown }) {
  const theme = useTheme();
  const labelColor =
    breakdown.label === 'Excellent' || breakdown.label === 'Good'
      ? theme.success
      : breakdown.label === 'Fair'
        ? theme.warning
        : theme.danger;

  return (
    <Card style={styles.card}>
      <ProgressRing progress={breakdown.score} size={112} strokeWidth={10} color={labelColor}>
        <ThemedText style={styles.score}>{breakdown.score}</ThemedText>
      </ProgressRing>
      <View style={styles.textBlock}>
        <ThemedText type="small" themeColor="textSecondary">
          Money health score
        </ThemedText>
        <ThemedText numberOfLines={1} style={[styles.label, { color: labelColor }]}>
          {breakdown.label}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={2}
          style={styles.copy}>
          {LABEL_COPY[breakdown.label]}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  score: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  label: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  copy: {
    textAlign: 'center',
    maxWidth: 280,
  },
});
