import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatFullDate, fromISODate } from '@/lib/dates';
import { getCurrencyFormatter } from '@/lib/currency';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/budget-store';
import type { Transaction } from '@/types';

export default function TransactionsScreen() {
  const theme = useTheme();
  const transactions = useBudgetStore((s) => s.transactions);
  const profile = useBudgetStore((s) => s.profile);
  const accounts = useBudgetStore((s) => s.accounts);

  const currency = profile?.currency ?? 'USD';
  const formatter = useMemo(() => getCurrencyFormatter(currency), [currency]);
  const formatAmount = useMemo(() => (amount: number) => formatter.format(amount), [formatter]);

  const sections = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    for (const transaction of transactions) {
      grouped[transaction.date] = grouped[transaction.date] ?? [];
      grouped[transaction.date].push(transaction);
    }
    return Object.entries(grouped)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, items]) => ({
        title: date,
        data: items.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      }));
  }, [transactions]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">All transactions</ThemedText>
          <Pressable hitSlop={8} onPress={() => router.push('/transaction-form')}>
            <Ionicons name="add-circle" size={26} color={theme.brand} />
          </Pressable>
        </View>

        <SectionList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionHeader}>
              {formatFullDate(fromISODate(section.title))}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              formatAmount={formatAmount}
              accounts={accounts}
              onPress={() => router.push({ pathname: '/transaction-form', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              message="Add your first transaction to start tracking your spending."
            />
          }
        />
      </SafeAreaView>
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
  list: {
    flex: 1,
    alignSelf: 'stretch',
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
});
