import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CategoryIcon } from '@/components/ui/category-icon';
import { getCategoryById } from '@/data/categories';
import { Spacing } from '@/constants/theme';
import { fromISODate, formatShortDate } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';
import type { Account, Transaction } from '@/types';

type TransactionRowProps = {
  transaction: Transaction;
  /** Formats an amount with the profile's currency — built once by the parent list
   * screen (currency is constant across a render pass) instead of each row
   * constructing its own Intl.NumberFormat. */
  formatAmount: (amount: number) => string;
  /** Only shown when there's more than one account — a single-account app has
   * nothing to disambiguate, so the tag would just be redundant noise. */
  accounts?: Account[];
  onPress?: () => void;
};

export function TransactionRow({ transaction, formatAmount, accounts = [], onPress }: TransactionRowProps) {
  const theme = useTheme();
  const category = getCategoryById(transaction.categoryId);
  const isIncome = transaction.type === 'income';

  const accountName =
    accounts.length > 1
      ? (accounts.find((a) => a.id === transaction.accountId) ?? accounts[0])?.name
      : undefined;

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
            {accountName ? ` · ${accountName}` : ''}
          </ThemedText>
          <ThemedText
            type="smallBold"
            numberOfLines={1}
            style={{ color: isIncome ? theme.success : theme.text }}>
            {isIncome ? '+' : '-'}
            {formatAmount(transaction.amount)}
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
