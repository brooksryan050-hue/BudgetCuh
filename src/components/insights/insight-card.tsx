import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Insight, Recommendation } from '@/types';

const ICON_BY_SEVERITY: Record<Insight['severity'], keyof typeof Ionicons.glyphMap> = {
  positive: 'trending-up',
  neutral: 'information-circle',
  warning: 'alert-circle',
};

export function InsightCard({ insight }: { insight: Insight }) {
  const theme = useTheme();
  const color =
    insight.severity === 'positive' ? theme.success : insight.severity === 'warning' ? theme.warning : theme.brand;
  const background =
    insight.severity === 'positive'
      ? theme.successBackground
      : insight.severity === 'warning'
        ? theme.warningBackground
        : theme.backgroundElement;

  return (
    <View style={[styles.row, { backgroundColor: background }]}>
      <Ionicons name={ICON_BY_SEVERITY[insight.severity]} size={18} color={color} />
      <ThemedText type="small" numberOfLines={2} style={styles.message}>
        {insight.message}
      </ThemedText>
    </View>
  );
}

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="bulb" size={18} color={theme.brand} />
      <ThemedText type="small" numberOfLines={2} style={styles.message}>
        {recommendation.message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  message: {
    flex: 1,
  },
});
