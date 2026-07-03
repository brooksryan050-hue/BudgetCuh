import { useMemo } from 'react';

import { computeDailyDisciplineStreak, computeSavingWeekStreak } from '@/lib/streaks';
import { useBudgetStore } from '@/store/budget-store';

export function useStreaks(referenceDate: Date) {
  const transactions = useBudgetStore((s) => s.transactions);
  const profile = useBudgetStore((s) => s.profile);
  const weeklySummaries = useBudgetStore((s) => s.weeklySummaries);

  return useMemo(
    () => ({
      dailyDisciplineStreak: computeDailyDisciplineStreak(transactions, profile, referenceDate),
      savingWeekStreak: computeSavingWeekStreak(weeklySummaries),
    }),
    [transactions, profile, weeklySummaries, referenceDate]
  );
}
