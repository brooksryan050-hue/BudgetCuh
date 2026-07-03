import { getMonthlyTotals, getPriorWeeksAverage, getWeeklyTotals } from '@/lib/totals';
import type { Budget, MoneyHealthBreakdown, Transaction, UserProfile } from '@/types';
import { getBudgetUsages } from '@/lib/budgets';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scoreLabel(score: number): MoneyHealthBreakdown['label'] {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs attention';
}

export function computeMoneyHealthScore(
  transactions: Transaction[],
  budgets: Budget[],
  profile: UserProfile | null,
  referenceDate: Date
): MoneyHealthBreakdown {
  const { income, expenses } = getMonthlyTotals(transactions, referenceDate);

  const savingRateScore = (() => {
    if (!income) return 50;
    const savingRate = Math.max(0, (income - expenses) / income);
    return clamp((savingRate / 0.2) * 100, 0, 100);
  })();

  const usages = getBudgetUsages(transactions, budgets, referenceDate);
  const budgetAdherenceScore = (() => {
    if (usages.length === 0) return 60;
    const adherences = usages.map((usage) => clamp(1 - Math.max(0, usage.pctUsed / 100 - 1), 0, 1));
    return (adherences.reduce((sum, a) => sum + a, 0) / adherences.length) * 100;
  })();

  const overspendingScore = (() => {
    const overBudgetCount = usages.filter((usage) => usage.status === 'over_budget').length;
    return clamp(100 - overBudgetCount * 25, 0, 100);
  })();

  const trendScore = (() => {
    const priorAvg = getPriorWeeksAverage(transactions, referenceDate, 4);
    if (priorAvg <= 0) return 60;
    const { expenses: thisWeekExpenses } = getWeeklyTotals(transactions, referenceDate);
    const pctChange = (thisWeekExpenses - priorAvg) / priorAvg;
    return clamp(100 - Math.max(0, pctChange) * 200, 0, 100);
  })();

  const score = Math.round(
    0.4 * savingRateScore + 0.3 * budgetAdherenceScore + 0.15 * overspendingScore + 0.15 * trendScore
  );

  void profile;

  return {
    score,
    savingRateScore: Math.round(savingRateScore),
    budgetAdherenceScore: Math.round(budgetAdherenceScore),
    overspendingScore: Math.round(overspendingScore),
    trendScore: Math.round(trendScore),
    label: scoreLabel(score),
  };
}
