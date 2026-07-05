import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { AccountBalanceCard } from '@/components/home/account-balance-card';
import { AiFeaturesSection } from '@/components/home/ai-features-section';
import { BudgetRemainingCard } from '@/components/home/budget-remaining-card';
import { HeroStatCard } from '@/components/home/hero-stat-card';
import { HomeHero } from '@/components/home/home-hero';
import { HomeQuickActions } from '@/components/home/home-quick-actions';
import { MetricList, type MetricListItem } from '@/components/home/metric-list';
import { MoneyHealthCard } from '@/components/home/money-health-card';
import { SavingsGoalEmptyCard } from '@/components/home/savings-goal-empty-card';
import { SavingsGoalsPager } from '@/components/home/savings-goals-pager';
import { InsightCard } from '@/components/insights/insight-card';
import { NotificationCard } from '@/components/notifications/notification-card';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { getCategoryById } from '@/data/categories';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  useMonthlyTotals,
  useMonthOverMonthChange,
  useMonthOverMonthSavingChange,
  useWeeklyTotals,
  useWeekOverWeekChange,
} from '@/hooks/use-monthly-totals';
import { useBudgetUsages } from '@/hooks/use-budget-usages';
import { useMoneyHealthScore } from '@/hooks/use-money-health-score';
import { useInsights } from '@/hooks/use-insights';
import { useNotificationCards } from '@/hooks/use-notification-cards';
import { useTheme } from '@/hooks/use-theme';
import { getCurrencyFormatter } from '@/lib/currency';
import { refreshSync } from '@/hooks/use-sync-bootstrap';
import { useBudgetStore } from '@/store/budget-store';

function formatPctChange(pctChange: number): string {
  if (pctChange === 0) return 'No change';
  const rounded = Math.round(pctChange);
  if (rounded === 0) return '<1%';
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

export default function HomeScreen() {
  const theme = useTheme();
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      setReferenceDate(new Date());
    }, [])
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshSync();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const profile = useBudgetStore((s) => s.profile);
  const transactions = useBudgetStore((s) => s.transactions);
  const accounts = useBudgetStore((s) => s.accounts);
  const savingsGoals = useBudgetStore((s) => s.savingsGoals);
  const markNotificationRead = useBudgetStore((s) => s.markNotificationRead);
  const dismissNotification = useBudgetStore((s) => s.dismissNotification);

  const currency = profile?.currency ?? 'USD';
  const formatter = getCurrencyFormatter(currency, 0);
  const formatAmount = useCallback((amount: number) => formatter.format(amount), [formatter]);

  const monthlyTotals = useMonthlyTotals(referenceDate);
  const weeklyTotals = useWeeklyTotals(referenceDate);
  const weekChange = useWeekOverWeekChange(referenceDate);
  const monthChange = useMonthOverMonthChange(referenceDate);
  const savingChange = useMonthOverMonthSavingChange(referenceDate);
  const budgetUsages = useBudgetUsages(referenceDate);
  const healthScore = useMoneyHealthScore(referenceDate);
  const insights = useInsights(referenceDate);
  const notifications = useNotificationCards(referenceDate);

  const budgetRemaining = budgetUsages.reduce((sum, usage) => sum + Math.max(0, usage.remaining), 0);
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  const [searchQuery, setSearchQuery] = useState('');
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredTransactions = useMemo(() => {
    if (!trimmedQuery) return transactions.slice(0, 5);
    return transactions
      .filter((transaction) => {
        const categoryName = getCategoryById(transaction.categoryId).name.toLowerCase();
        return transaction.notes?.toLowerCase().includes(trimmedQuery) || categoryName.includes(trimmedQuery);
      })
      .slice(0, 20);
  }, [transactions, trimmedQuery]);

  const scrollViewRef = useRef<ScrollView>(null);
  const accountsSectionY = useRef(0);

  function scrollToAccounts() {
    scrollViewRef.current?.scrollTo({ y: accountsSectionY.current, animated: true });
  }

  const secondaryMetrics: MetricListItem[] = [
    { key: 'saved-week', label: 'Saved this week', value: formatter.format(weeklyTotals.saved) },
    {
      key: 'week-change',
      label: 'Spending vs last week',
      value: formatPctChange(weekChange.pctChange),
      deltaDirection: weekChange.pctChange > 0 ? 'down' : weekChange.pctChange < 0 ? 'up' : 'neutral',
      colorize: true,
    },
    {
      key: 'month-change',
      label: 'Spending vs last month',
      value: formatPctChange(monthChange.pctChange),
      deltaDirection: monthChange.pctChange > 0 ? 'down' : monthChange.pctChange < 0 ? 'up' : 'neutral',
      colorize: true,
    },
    {
      key: 'saving-change',
      label: 'Saving vs last month',
      value: formatPctChange(savingChange.pctChange),
      deltaDirection: savingChange.pctChange > 0 ? 'up' : savingChange.pctChange < 0 ? 'down' : 'neutral',
      colorize: true,
    },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* No 'top' edge here — HomeHero's gradient needs to extend behind the status
          bar/notch instead of stopping below it, and handles its own top inset internally. */}
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />}>
          <ThemedView style={styles.heroWrapper}>
            <HomeHero
              balanceLabel="Total balance"
              balanceValue={formatter.format(totalBalance)}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onStatsPress={() => router.push('/(tabs)/trends')}
              onLedgerPress={() => router.push('/transactions')}
              onAccountsPress={scrollToAccounts}
            />
          </ThemedView>

          <ThemedView style={styles.darkBlockOuter}>
            <View style={styles.darkBlockInner}>
              <HomeQuickActions />

              <View>
                <SectionHeader
                  title={trimmedQuery ? 'Search results' : 'Recent transactions'}
                  actionLabel={trimmedQuery ? undefined : 'See all'}
                  onActionPress={trimmedQuery ? undefined : () => router.push('/transactions')}
                />
                {filteredTransactions.length === 0 ? (
                  <View>
                    <EmptyState
                      icon="receipt-outline"
                      title={trimmedQuery ? 'No matching transactions' : 'No transactions yet'}
                    />
                    {trimmedQuery ? null : (
                      <Pressable
                        style={[styles.addTransactionButton, { backgroundColor: theme.brand }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          router.push('/transaction-form');
                        }}>
                        <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                          Add a transaction
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <Card style={styles.transactionsCard}>
                    {filteredTransactions.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        formatAmount={formatAmount}
                        accounts={accounts}
                        onPress={() =>
                          router.push({ pathname: '/transaction-form', params: { id: transaction.id } })
                        }
                      />
                    ))}
                  </Card>
                )}
              </View>
            </View>
          </ThemedView>

          <View
            style={styles.innerContent}
            onLayout={(event) => {
              accountsSectionY.current = event.nativeEvent.layout.y;
            }}>
            <AccountBalanceCard />

            <View style={styles.heroRow}>
              <HeroStatCard
                label="Income this month"
                value={formatter.format(monthlyTotals.income)}
                icon="arrow-down-circle"
                tintColor={theme.success}
                tintBackground={theme.successBackground}
              />
              <HeroStatCard
                label="Spent this month"
                value={formatter.format(monthlyTotals.expenses)}
                icon="arrow-up-circle"
                tintColor={theme.danger}
                tintBackground={theme.dangerBackground}
              />
            </View>

            <MetricList items={secondaryMetrics} />

            <BudgetRemainingCard value={formatter.format(budgetRemaining)} />

            <MoneyHealthCard breakdown={healthScore} />

            <AiFeaturesSection />

            <View>
              <SectionHeader
                title="Savings goals"
                actionLabel="View all"
                onActionPress={() => router.push('/savings-goals')}
              />
              {savingsGoals.length > 0 ? (
                <SavingsGoalsPager goals={savingsGoals} currency={currency} />
              ) : (
                <SavingsGoalEmptyCard />
              )}
            </View>

            {notifications.length > 0 ? (
              <View>
                <SectionHeader title="Updates" />
                <View style={styles.notificationList}>
                  {notifications.slice(0, 3).map((card) => (
                    <NotificationCard
                      key={card.id}
                      card={card}
                      onPress={() => markNotificationRead(card.id)}
                      onDismiss={() => dismissNotification(card.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {insights.length > 0 ? (
              <View>
                <SectionHeader
                  title="Insights"
                  actionLabel="See all"
                  onActionPress={() => router.push('/(tabs)/trends')}
                />
                <View style={styles.insightList}>
                  {insights.slice(0, 3).map((insight) => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%' },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  heroWrapper: {
    width: '100%',
  },
  darkBlockOuter: {
    width: '100%',
  },
  darkBlockInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  innerContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
  heroRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  notificationList: {
    gap: Spacing.two,
  },
  insightList: {
    gap: Spacing.two,
  },
  transactionsCard: {
    paddingVertical: Spacing.two,
  },
  addTransactionButton: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
  },
});
