import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { getCategoryById } from '@/data/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCurrencyFormatter } from '@/lib/currency';
import type { BudgetUsage } from '@/types';

export function BudgetCategoryRow({
  usage,
  currency,
  onPress,
}: {
  usage: BudgetUsage;
  currency: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const category = getCategoryById(usage.categoryId);
  const formatter = getCurrencyFormatter(currency, 0);

  const barColor =
    usage.status === 'over_budget' ? theme.danger : usage.status === 'near_limit' ? theme.warning : theme.success;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.headerRow}>
        <CategoryIcon categoryId={usage.categoryId} size={32} />
        <View style={styles.headerText}>
          <ThemedText type="default">{category.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatter.format(usage.spent)} of {formatter.format(usage.limit)}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" style={{ color: barColor }}>
          {Math.round(usage.pctUsed)}%
        </ThemedText>
      </View>
      <ProgressBar progress={usage.pctUsed} color={barColor} />
      {usage.status === 'over_budget' ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          Over budget by {formatter.format(Math.abs(usage.remaining))}
        </ThemedText>
      ) : usage.status === 'near_limit' ? (
        <ThemedText type="small" style={{ color: theme.warning }}>
          Close to your limit — {formatter.format(usage.remaining)} left
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
