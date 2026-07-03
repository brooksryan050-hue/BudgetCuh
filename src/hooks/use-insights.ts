import { useMemo } from 'react';

import { generateInsights, generateRecommendations } from '@/lib/insights';
import { useBudgetStore } from '@/store/budget-store';

export function useInsights(referenceDate: Date) {
  const transactions = useBudgetStore((s) => s.transactions);
  const budgets = useBudgetStore((s) => s.budgets);
  const profile = useBudgetStore((s) => s.profile);
  const weeklySummaries = useBudgetStore((s) => s.weeklySummaries);
  return useMemo(
    () => generateInsights({ transactions, budgets, profile, weeklySummaries, referenceDate }),
    [transactions, budgets, profile, weeklySummaries, referenceDate]
  );
}

export function useRecommendations(referenceDate: Date) {
  const transactions = useBudgetStore((s) => s.transactions);
  const budgets = useBudgetStore((s) => s.budgets);
  const profile = useBudgetStore((s) => s.profile);
  const weeklySummaries = useBudgetStore((s) => s.weeklySummaries);
  return useMemo(
    () => generateRecommendations({ transactions, budgets, profile, weeklySummaries, referenceDate }),
    [transactions, budgets, profile, weeklySummaries, referenceDate]
  );
}
