import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { DonutChart } from '@/components/charts/donut-chart';
import { BarChart, GroupedBarChart } from '@/components/charts/bar-chart';
import { InsightCard, RecommendationCard } from '@/components/insights/insight-card';
import { getCategoryById } from '@/data/categories';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  addDays,
  formatMonthLabel,
  formatWeekRangeLabel,
  getMonthRange,
  getWeekRange,
  getWeekdayLabel,
  toISODate,
} from '@/lib/dates';
import { getCurrencyFormatter } from '@/lib/currency';
import { getCategoryTotals, filterByRange, sumByType } from '@/lib/totals';
import { useInsights, useRecommendations } from '@/hooks/use-insights';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/budget-store';

type ViewMode = 'week' | 'month';

export default function TrendsScreen() {
  const theme = useTheme();
  const today = useMemo(() => new Date(), []);
  const profile = useBudgetStore((s) => s.profile);
  const transactions = useBudgetStore((s) => s.transactions);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(today);

  const currency = profile?.currency ?? 'USD';
  const formatter = getCurrencyFormatter(currency, 0);

  const insights = useInsights(today);
  const recommendations = useRecommendations(today);

  const periodRange = useMemo(
    () => (viewMode === 'month' ? getMonthRange(selectedDate) : getWeekRange(selectedDate)),
    [viewMode, selectedDate]
  );
  const isCurrentPeriod =
    viewMode === 'month'
      ? selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() === today.getMonth()
      : toISODate(getWeekRange(selectedDate).start) === toISODate(getWeekRange(today).start);

  function goToPrevious() {
    setSelectedDate((d) => (viewMode === 'month' ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : addDays(d, -7)));
  }
  function goToNext() {
    if (isCurrentPeriod) return;
    setSelectedDate((d) => (viewMode === 'month' ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : addDays(d, 7)));
  }
  function switchMode(mode: ViewMode) {
    setViewMode(mode);
    setSelectedDate(today);
  }

  const periodLabel = viewMode === 'month' ? formatMonthLabel(selectedDate) : formatWeekRangeLabel(periodRange);

  const categoryDonutData = useMemo(() => {
    const totals = getCategoryTotals(transactions, periodRange);
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([categoryId, value]) => {
        const category = getCategoryById(categoryId);
        return { label: category.name, value, color: category.color };
      });
  }, [transactions, periodRange]);

  const weeklyTrendData = useMemo(() => {
    const weeks = 6;
    const anchor = viewMode === 'week' ? selectedDate : periodRange.end;
    return Array.from({ length: weeks }, (_, i) => {
      const weekOffset = weeks - 1 - i;
      const weekReference = addDays(anchor, -weekOffset * 7);
      const range = getWeekRange(weekReference);
      const spend = sumByType(filterByRange(transactions, range), 'expense');
      const label = weekOffset === 0 ? 'Sel. wk' : `${weekOffset}w prior`;
      return { label, value: spend };
    });
  }, [transactions, viewMode, selectedDate, periodRange]);

  const weekDayBreakdown = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(periodRange.start, i));
    return days.map((day) => {
      const spend = transactions
        .filter((t) => t.type === 'expense' && t.date === toISODate(day))
        .reduce((sum, t) => sum + t.amount, 0);
      return { label: getWeekdayLabel(day), value: spend };
    });
  }, [transactions, periodRange]);

  const monthWeekBreakdown = useMemo(() => {
    const buckets: { label: string; value: number }[] = [];
    let weekStart = periodRange.start;
    let weekNumber = 1;
    while (weekStart <= periodRange.end) {
      const weekEndMs = Math.min(addDays(weekStart, 6).getTime(), periodRange.end.getTime());
      const spend = sumByType(
        filterByRange(transactions, { start: weekStart, end: new Date(weekEndMs) }),
        'expense'
      );
      buckets.push({ label: `Wk ${weekNumber}`, value: spend });
      weekStart = addDays(weekStart, 7);
      weekNumber += 1;
    }
    return buckets;
  }, [transactions, periodRange]);

  const incomeVsExpenseData = useMemo(() => {
    const months = 4;
    const anchor = viewMode === 'month' ? selectedDate : periodRange.end;
    return Array.from({ length: months }, (_, i) => {
      const monthOffset = months - 1 - i;
      const monthReference = new Date(anchor.getFullYear(), anchor.getMonth() - monthOffset, 1);
      const range = getMonthRange(monthReference);
      const inRange = filterByRange(transactions, range);
      return {
        label: monthReference.toLocaleDateString('en-US', { month: 'short' }),
        a: sumByType(inRange, 'income'),
        b: sumByType(inRange, 'expense'),
      };
    });
  }, [transactions, viewMode, selectedDate, periodRange]);

  const biggestCategories = categoryDonutData.slice(0, 3);
  const periodTotal = categoryDonutData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>
            Trends
          </ThemedText>

          <View style={styles.modeRow}>
            <Pill label="Week" selected={viewMode === 'week'} onPress={() => switchMode('week')} />
            <Pill label="Month" selected={viewMode === 'month'} onPress={() => switchMode('month')} />
          </View>

          <View style={[styles.periodNav, { backgroundColor: theme.backgroundElement }]}>
            <Pressable hitSlop={8} onPress={goToPrevious}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </Pressable>
            <ThemedText type="smallBold">{periodLabel}</ThemedText>
            <Pressable hitSlop={8} onPress={goToNext} disabled={isCurrentPeriod}>
              <Ionicons name="chevron-forward" size={20} color={isCurrentPeriod ? theme.textSecondary : theme.text} />
            </Pressable>
          </View>

          {transactions.length === 0 ? (
            <EmptyState icon="stats-chart-outline" title="Not enough data yet" message="Add a few transactions to see your trends." />
          ) : (
            <>
              <Card>
                <SectionHeader title="Spending by category" />
                <DonutChart
                  data={categoryDonutData}
                  centerValue={formatter.format(periodTotal)}
                  centerLabel={viewMode === 'month' ? 'this month' : 'this week'}
                />
              </Card>

              <Card>
                <SectionHeader title="Weekly spending trend" />
                <BarChart data={weeklyTrendData} highlightIndex={weeklyTrendData.length - 1} />
              </Card>

              <Card>
                <SectionHeader title={viewMode === 'week' ? 'This week, by day' : 'This month, by week'} />
                <BarChart
                  data={viewMode === 'week' ? weekDayBreakdown : monthWeekBreakdown}
                  color={theme.brandSecondary}
                />
              </Card>

              <Card>
                <SectionHeader title="Income vs expenses" />
                <GroupedBarChart data={incomeVsExpenseData} />
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                    <ThemedText type="small" themeColor="textSecondary">
                      Income
                    </ThemedText>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
                    <ThemedText type="small" themeColor="textSecondary">
                      Expenses
                    </ThemedText>
                  </View>
                </View>
              </Card>

              {biggestCategories.length > 0 ? (
                <Card>
                  <SectionHeader title={viewMode === 'month' ? 'Biggest categories this month' : 'Biggest categories this week'} />
                  <View style={styles.biggestList}>
                    {biggestCategories.map((item) => (
                      <View key={item.label} style={styles.biggestRow}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <ThemedText type="small" style={styles.biggestLabel}>
                          {item.label}
                        </ThemedText>
                        <ThemedText type="smallBold">{formatter.format(item.value)}</ThemedText>
                      </View>
                    ))}
                  </View>
                </Card>
              ) : null}
            </>
          )}

          {insights.length > 0 ? (
            <View>
              <SectionHeader title="Insights" />
              <View style={styles.stack}>
                {insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </View>
            </View>
          ) : null}

          {recommendations.length > 0 ? (
            <View>
              <SectionHeader title="Smart recommendations" />
              <View style={styles.stack}>
                {recommendations.map((recommendation) => (
                  <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                ))}
              </View>
            </View>
          ) : null}
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
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  modeRow: {
    flexDirection: 'row',
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.two,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  biggestList: {
    gap: Spacing.two,
  },
  biggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  biggestLabel: {
    flex: 1,
  },
  stack: {
    gap: Spacing.two,
  },
});
