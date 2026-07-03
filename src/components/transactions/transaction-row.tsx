import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CategoryIcon } from '@/components/ui/category-icon';
import { getCategoryById } from '@/data/categories';
import { Spacing } from '@/constants/theme';
import { fromISODate, formatShortDate } from '@/lib/dates';
import { getCurrencyFormatter } from '@/lib/currency';
import { useTheme } from '@/hooks/use-theme';
import type { Transaction } from '@/types';

type TransactionRowProps = {
  transaction: Transaction;
  currency: string;
  onPress?: () => void;
};

export function TransactionRow({ transaction, currency, onPress }: TransactionRowProps) {
  const theme = useTheme();
  const category = getCategoryById(transaction.categoryId);
  const isIncome = transaction.type === 'income';

  const formatter = getCurrencyFormatter(currency);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <CategoryIcon categoryId={transaction.categoryId} />
      <View style={styles.details}>
        <ThemedText type="default" numberOfLines={1}>
          {transaction.notes?.trim() || category.name}
        </ThemedText>
        <View style={styles.subRow}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.subtext}>
            {formatShortDate(fromISODate(transaction.date))}
            {transaction.isRecurring ? ' · Recurring' : ''}
          </ThemedText>
          <ThemedText
            type="smallBold"
            numberOfLines={1}
            style={{ color: isIncome ? theme.success : theme.text }}>
            {isIncome ? '+' : '-'}
            {formatter.format(transaction.amount)}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  subtext: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
