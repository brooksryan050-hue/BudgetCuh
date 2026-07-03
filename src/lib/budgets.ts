import { getMonthRange } from '@/lib/dates';
import { getCategoryTotals } from '@/lib/totals';
import type { Budget, BudgetUsage, Transaction } from '@/types';

export function getBudgetUsages(
  transactions: Transaction[],
  budgets: Budget[],
  referenceDate: Date
): BudgetUsage[] {
  const range = getMonthRange(referenceDate);
  const spentByCategory = getCategoryTotals(transactions, range);

  return budgets.map((budget) => {
    const spent = spentByCategory[budget.categoryId] ?? 0;
    const pctUsed = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
    const remaining = budget.monthlyLimit - spent;

    let status: BudgetUsage['status'] = 'ok';
    if (pctUsed >= 100) status = 'over_budget';
    else if (pctUsed >= 80) status = 'near_limit';

    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      limit: budget.monthlyLimit,
      spent,
      remaining,
      pctUsed,
      status,
    };
  });
}
