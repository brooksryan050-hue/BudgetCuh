import { useMemo } from 'react';

import {
  getMonthlyTotals,
  getMonthOverMonthChange,
  getMonthOverMonthSavingChange,
  getWeeklyTotals,
  getWeekOverWeekChange,
} from '@/lib/totals';
import { useBudgetStore } from '@/store/budget-store';

export function useMonthlyTotals(referenceDate: Date) {
  const transactions = useBudgetStore((s) => s.transactions);
  return useMemo(() => getMonthlyTotals(transactions, referenceDate), [transactions, referenceDate]);
}

export function useWeeklyTotals(referenceDate: Date) {
  const transactions = useBudgetStore((s) => s.transactions);
  return useMemo(() => getWeeklyTotals(transactions, referenceDate), [transactions, referenceDate]);
}

export function useWeekOverWeekChange(referenceDate: Date, categoryId?: string) {
  const transactions = useBudgetStore((s) => s.transactions);
  return useMemo(
    () => getWeekOverWeekChange(transactions, referenceDate, categoryId),
    [transactions, referenceDate, categoryId]
  );
}

export function useMonthOverMonthChange(referenceDate: Date, categoryId?: string) {
  const transactions = useBudgetStore((s) => s.transactions);
  return useMemo(
    () => getMonthOverMonthChange(transactions, referenceDate, categoryId),
    [transactions, referenceDate, categoryId]
  );
}

export function useMonthOverMonthSavingChange(referenceDate: Date) {
  const transactions = useBudgetStore((s) => s.transactions);
  return useMemo(
    () => getMonthOverMonthSavingChange(transactions, referenceDate),
    [transactions, referenceDate]
  );
}
