import { useMemo } from 'react';

import { getBudgetUsages } from '@/lib/budgets';
import { useBudgetStore } from '@/store/budget-store';

export function useBudgetUsages(referenceDate: Date) {
  const transactions = useBudgetStore((s) => s.transactions);
  const budgets = useBudgetStore((s) => s.budgets);
  return useMemo(
    () => getBudgetUsages(transactions, budgets, referenceDate),
    [transactions, budgets, referenceDate]
  );
}
