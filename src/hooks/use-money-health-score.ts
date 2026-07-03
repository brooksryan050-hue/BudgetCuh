import { useMemo } from 'react';

import { computeMoneyHealthScore } from '@/lib/money-health';
import { useBudgetStore } from '@/store/budget-store';

export function useMoneyHealthScore(referenceDate: Date) {
  const transactions = useBudgetStore((s) => s.transactions);
  const budgets = useBudgetStore((s) => s.budgets);
  const profile = useBudgetStore((s) => s.profile);
  return useMemo(
    () => computeMoneyHealthScore(transactions, budgets, profile, referenceDate),
    [transactions, budgets, profile, referenceDate]
  );
}
