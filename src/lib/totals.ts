import { addDays, getMonthRange, getWeekRange, isWithinRange } from '@/lib/dates';
import type { DateRange, Transaction } from '@/types';

export function filterByRange(transactions: Transaction[], range: DateRange): Transaction[] {
  return transactions.filter((transaction) => {
    const [year, month, day] = transaction.date.split('-').map(Number);
    return isWithinRange(new Date(year, month - 1, day), range);
  });
}

export function sumByType(transactions: Transaction[], type: 'income' | 'expense'): number {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);
}

export function getCategoryTotals(
  transactions: Transaction[],
  range: DateRange
): Record<string, number> {
  const inRange = filterByRange(transactions, range).filter((t) => t.type === 'expense');
  const totals: Record<string, number> = {};
  for (const transaction of inRange) {
    totals[transaction.categoryId] = (totals[transaction.categoryId] ?? 0) + transaction.amount;
  }
  return totals;
}

export function getMonthlyTotals(transactions: Transaction[], referenceDate: Date) {
  const range = getMonthRange(referenceDate);
  const inRange = filterByRange(transactions, range);
  const income = sumByType(inRange, 'income');
  const expenses = sumByType(inRange, 'expense');
  return { income, expenses, saved: income - expenses, range };
}

export function getWeeklyTotals(transactions: Transaction[], referenceDate: Date) {
  const range = getWeekRange(referenceDate);
  const inRange = filterByRange(transactions, range);
  const income = sumByType(inRange, 'income');
  const expenses = sumByType(inRange, 'expense');
  return { income, expenses, saved: income - expenses, range };
}

export function getWeekOverWeekChange(
  transactions: Transaction[],
  referenceDate: Date,
  categoryId?: string
): { current: number; previous: number; pctChange: number } {
  const currentRange = getWeekRange(referenceDate);
  const previousRange = getWeekRange(addDays(referenceDate, -7));

  const currentExpenses = filterByRange(transactions, currentRange).filter(
    (t) => t.type === 'expense' && (!categoryId || t.categoryId === categoryId)
  );
  const previousExpenses = filterByRange(transactions, previousRange).filter(
    (t) => t.type === 'expense' && (!categoryId || t.categoryId === categoryId)
  );

  const current = sumByType(currentExpenses, 'expense');
  const previous = sumByType(previousExpenses, 'expense');
  const pctChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  return { current, previous, pctChange };
}

export function getMonthOverMonthChange(
  transactions: Transaction[],
  referenceDate: Date,
  categoryId?: string
): { current: number; previous: number; pctChange: number } {
  const currentRange = getMonthRange(referenceDate);
  const previousMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const previousRange = getMonthRange(previousMonthDate);

  const currentExpenses = filterByRange(transactions, currentRange).filter(
    (t) => t.type === 'expense' && (!categoryId || t.categoryId === categoryId)
  );
  const previousExpenses = filterByRange(transactions, previousRange).filter(
    (t) => t.type === 'expense' && (!categoryId || t.categoryId === categoryId)
  );

  const current = sumByType(currentExpenses, 'expense');
  const previous = sumByType(previousExpenses, 'expense');
  const pctChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  return { current, previous, pctChange };
}

/**
 * % change in "saved" (income - expenses) vs the prior calendar month. Divides by
 * |previous| rather than previous so the sign of pctChange stays meaningful even
 * when a month's saved total is negative (spent more than earned).
 */
export function getMonthOverMonthSavingChange(
  transactions: Transaction[],
  referenceDate: Date
): { current: number; previous: number; pctChange: number } {
  const current = getMonthlyTotals(transactions, referenceDate).saved;
  const previousMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const previous = getMonthlyTotals(transactions, previousMonthDate).saved;

  let pctChange = 0;
  if (previous !== 0) {
    pctChange = ((current - previous) / Math.abs(previous)) * 100;
  } else if (current !== 0) {
    pctChange = current > 0 ? 100 : -100;
  }

  return { current, previous, pctChange };
}

export function getAverageDailySpend(transactions: Transaction[], referenceDate: Date, days = 30): number {
  const start = addDays(referenceDate, -days);
  const inRange = filterByRange(transactions, { start, end: referenceDate }).filter(
    (t) => t.type === 'expense'
  );
  const total = sumByType(inRange, 'expense');
  return total / days;
}

export function getPriorWeeksAverage(
  transactions: Transaction[],
  referenceDate: Date,
  weeks: number,
  categoryId?: string
): number {
  let total = 0;
  for (let i = 1; i <= weeks; i++) {
    const range = getWeekRange(addDays(referenceDate, -7 * i));
    const inRange = filterByRange(transactions, range).filter(
      (t) => t.type === 'expense' && (!categoryId || t.categoryId === categoryId)
    );
    total += sumByType(inRange, 'expense');
  }
  return total / weeks;
}
