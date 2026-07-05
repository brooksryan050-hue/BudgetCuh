import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatMonthLabel, formatWeekRangeLabel, fromISODate } from '@/lib/dates';
import { getCurrencyFormatter } from '@/lib/currency';
import { useReflections } from '@/hooks/use-ai-reflections';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/budget-store';
import type { AiReflection, ReflectionPeriodType } from '@/types';

const PERIOD_TABS: { key: ReflectionPeriodType; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

function periodLabel(reflection: AiReflection): string {
  if (reflection.periodType === 'weekly') {
    return formatWeekRangeLabel({ start: fromISODate(reflection.periodStart), end: fromISODate(reflection.periodEnd) });
  }
  return formatMonthLabel(fromISODate(reflection.periodStart));
}

export default function ReflectionScreen() {
  const theme = useTheme();
  const profile = useBudgetStore((s) => s.profile);
  const currency = profile?.currency ?? 'USD';
  const formatter = getCurrencyFormatter(currency, 0);

  const [periodType, setPeriodType] = useState<ReflectionPeriodType>('weekly');
  const { reflections, loading, error, refresh } = useReflections(periodType);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">Reflections</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.tabRow}>
          {PERIOD_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setPeriodType(tab.key)}
              style={[
                styles.tab,
                { backgroundColor: theme.backgroundElement },
                periodType === tab.key && { backgroundColor: theme.brand },
              ]}>
              <ThemedText
                type="smallBold"
                style={periodType === tab.key ? { color: '#ffffff' } : undefined}>
                {tab.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.textSecondary} />}>
          {reflections.length === 0 && error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Couldn't load your reflections"
              message="Something went wrong fetching these — try again later."
            />
          ) : reflections.length === 0 ? (
            <EmptyState
              icon="book-outline"
              title={`No ${periodType} reflections yet`}
              message="Check back once your first period wraps up — this builds automatically."
            />
          ) : (
            reflections.map((reflection) => (
              <Card key={reflection.id} style={styles.reflectionCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  {periodLabel(reflection)}
                </ThemedText>
                <ThemedText type="default">{reflection.summary}</ThemedText>

                <View style={styles.statsRow}>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.statItem}>
                    Income {formatter.format(reflection.totals.income)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.statItem}>
                    Spent {formatter.format(reflection.totals.expenses)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.statItem}>
                    Saved {formatter.format(reflection.totals.saved)}
                  </ThemedText>
                </View>

                {reflection.highlights.length > 0 ? (
                  <View style={styles.highlightList}>
                    {reflection.highlights.map((highlight, index) => (
                      <View key={`${reflection.id}-${index}`} style={styles.highlightRow}>
                        <Ionicons name="ellipse" size={6} color={theme.brand} style={styles.bullet} />
                        <ThemedText type="small" style={styles.highlightText}>
                          {highlight}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}

                {reflection.categoryInsight ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {reflection.categoryInsight}
                  </ThemedText>
                ) : null}
              </Card>
            ))
          )}
        </ScrollView>
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
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  tab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  reflectionCard: {
    gap: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statItem: {
    flexShrink: 1,
  },
  highlightList: {
    gap: Spacing.one,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  bullet: {
    marginTop: 7,
  },
  highlightText: {
    flex: 1,
  },
});
