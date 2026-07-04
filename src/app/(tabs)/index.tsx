import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { AccountBalanceCard } from '@/components/home/account-balance-card';
import { AiFeaturesSection } from '@/components/home/ai-features-section';
import { BudgetRemainingCard } from '@/components/home/budget-remaining-card';
import { HeroStatCard } from '@/components/home/hero-stat-card';
import { MetricList, type MetricListItem } from '@/components/home/metric-list';
import { MoneyHealthCard } from '@/components/home/money-health-card';
import { SavingsGoalEmptyCard } from '@/components/home/savings-goal-empty-card';
import { SavingsGoalsPager } from '@/components/home/savings-goals-pager';
import { InsightCard } from '@/components/insights/insight-card';
import { NotificationCard } from '@/components/notifications/notification-card';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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
import { useBudgetStore } from '@/store/budget-store';

function formatPctChange(pctChange: number): string {
  if (pctChange === 0) return 'No change';
  const rounded = Math.round(pctChange);
  if (rounded === 0) return '<1%';
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

export default function HomeScreen() {
  const theme = useTheme();
  const referenceDate = useMemo(() => new Date(), []);

  const profile = useBudgetStore((s) => s.profile);
  const transactions = useBudgetStore((s) => s.transactions);
  const savingsGoals = useBudgetStore((s) => s.savingsGoals);
  const markNotificationRead = useBudgetStore((s) => s.markNotificationRead);
  const dismissNotification = useBudgetStore((s) => s.dismissNotification);

  const currency = profile?.currency ?? 'USD';
  const formatter = getCurrencyFormatter(currency, 0);

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
  const recentTransactions = transactions.slice(0, 5);

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
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                Welcome back
              </ThemedText>
              <ThemedText type="title" style={styles.name}>
                {profile?.name ?? 'there'}
              </ThemedText>
            </View>
            <Pressable
              style={[styles.addButton, { backgroundColor: theme.brand }]}
              onPress={() => router.push('/transaction-form')}>
              <Ionicons name="add" size={22} color="#ffffff" />
            </Pressable>
          </View>

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
              <SectionHeader title="Insights" actionLabel="See all" onActionPress={() => router.push('/(tabs)/trends')} />
              <View style={styles.insightList}>
                {insights.slice(0, 3).map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </View>
            </View>
          ) : null}

          <View>
            <SectionHeader
              title="Recent transactions"
              actionLabel="See all"
              onActionPress={() => router.push('/transactions')}
            />
            {recentTransactions.length === 0 ? (
              <EmptyState icon="receipt-outline" title="No transactions yet" />
            ) : (
              <Card style={styles.transactionsCard}>
                {recentTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    currency={currency}
                    onPress={() => router.push({ pathname: '/transaction-form', params: { id: transaction.id } })}
                  />
                ))}
              </Card>
            )}
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
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 30,
    lineHeight: 36,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
});
