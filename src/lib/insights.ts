import { getCategoryById } from '@/data/categories';
import { getMonthRange } from '@/lib/dates';
import {
  getAverageDailySpend,
  getCategoryTotals,
  getPriorWeeksAverage,
  getWeekOverWeekChange,
  getWeeklyTotals,
} from '@/lib/totals';
import type { Budget, Insight, Recommendation, Transaction, UserProfile, WeeklySummary } from '@/types';

interface InsightContext {
  transactions: Transaction[];
  budgets: Budget[];
  profile: UserProfile | null;
  weeklySummaries: WeeklySummary[];
  referenceDate: Date;
}

function currencyRound(value: number): number {
  return Math.round(value * 100) / 100;
}

export function generateInsights(ctx: InsightContext): Insight[] {
  const { transactions, profile, weeklySummaries, referenceDate } = ctx;
  const insights: Insight[] = [];

  const categoriesInUse = new Set(transactions.map((t) => t.categoryId));
  for (const categoryId of categoriesInUse) {
    const { pctChange, current, previous } = getWeekOverWeekChange(transactions, referenceDate, categoryId);
    if (previous < 5) continue;
    const category = getCategoryById(categoryId);
    if (pctChange <= -15) {
      insights.push({
        id: `wow-drop-${categoryId}`,
        message: `You spent ${Math.round(Math.abs(pctChange))}% less on ${category.name.toLowerCase()} this week.`,
        severity: 'positive',
        categoryId,
      });
    } else if (pctChange >= 30 && current >= 20) {
      insights.push({
        id: `wow-spike-${categoryId}`,
        message: `Your ${category.name.toLowerCase()} spending is higher than usual this week.`,
        severity: 'warning',
        categoryId,
      });
    }
  }

  if (profile && profile.monthlyIncome > 0) {
    const monthRange = getMonthRange(referenceDate);
    const monthTotals = getCategoryTotals(transactions, monthRange);
    const subscriptionSpend = monthTotals['cat-subscriptions'] ?? 0;
    const pctOfIncome = (subscriptionSpend / profile.monthlyIncome) * 100;
    if (pctOfIncome >= 8) {
      insights.push({
        id: 'subscriptions-share',
        message: `Your subscriptions are taking up ${Math.round(pctOfIncome)}% of your monthly income.`,
        severity: pctOfIncome >= 15 ? 'warning' : 'neutral',
        categoryId: 'cat-subscriptions',
      });
    }
  }

  const thisWeek = getWeeklyTotals(transactions, referenceDate);
  const lastWeek = getWeeklyTotals(transactions, new Date(referenceDate.getTime() - 7 * 86400000));
  if (thisWeek.saved > lastWeek.saved && lastWeek.saved !== 0) {
    insights.push({
      id: 'saved-more',
      message: `You saved $${currencyRound(thisWeek.saved - lastWeek.saved)} more than last week. Nice progress.`,
      severity: 'positive',
    });
  }

  if (weeklySummaries.length >= 2) {
    const best = [...weeklySummaries].sort((a, b) => b.totalSaved - a.totalSaved)[0];
    const worst = [...weeklySummaries].sort((a, b) => a.totalSaved - b.totalSaved)[0];
    if (best) {
      insights.push({
        id: 'best-week',
        message: `Your best saving week so far was ${best.weekStartDate}, saving $${currencyRound(best.totalSaved)}.`,
        severity: 'positive',
      });
    }
    if (worst && worst.totalSaved < 0) {
      insights.push({
        id: 'worst-week',
        message: `Your toughest spending week was ${worst.weekStartDate}. Every week is a fresh start.`,
        severity: 'neutral',
      });
    }
  }

  const avgDaily = getAverageDailySpend(transactions, referenceDate);
  if (avgDaily > 0) {
    insights.push({
      id: 'avg-daily-spend',
      message: `You're averaging $${currencyRound(avgDaily)} in spending per day this month.`,
      severity: 'neutral',
    });
  }

  return insights;
}

export function generateRecommendations(ctx: InsightContext): Recommendation[] {
  const { transactions, budgets, profile, referenceDate } = ctx;
  const recommendations: Recommendation[] = [];

  const eatingOutAvg = getPriorWeeksAverage(transactions, referenceDate, 4, 'cat-eating-out');
  if (eatingOutAvg >= 30) {
    const potentialSavings = currencyRound(eatingOutAvg * 4 * 0.25);
    recommendations.push({
      id: 'reduce-eating-out',
      message: `You could save $${potentialSavings}/month by reducing eating out by 25%.`,
      potentialSavings,
      categoryId: 'cat-eating-out',
    });
  }

  const monthRange = getMonthRange(referenceDate);
  const recurringSubscriptions = transactions.filter(
    (t) => t.categoryId === 'cat-subscriptions' && t.isRecurring
  );
  const uniqueSubscriptionAmounts = new Set(recurringSubscriptions.map((t) => `${t.amount}`));
  if (uniqueSubscriptionAmounts.size >= 3) {
    const monthlySpend = getCategoryTotals(transactions, monthRange)['cat-subscriptions'] ?? 0;
    recommendations.push({
      id: 'review-subscriptions',
      message: `You have ${uniqueSubscriptionAmounts.size} recurring subscriptions worth $${currencyRound(monthlySpend)}/mo. Review them this week.`,
      categoryId: 'cat-subscriptions',
    });
  }

  const { pctChange } = getWeekOverWeekChange(transactions, referenceDate, 'cat-transport');
  if (pctChange >= 15) {
    recommendations.push({
      id: 'transport-increase',
      message: 'Your transport costs increased compared to last week.',
      categoryId: 'cat-transport',
    });
  }

  for (const budget of budgets) {
    const monthTotals = getCategoryTotals(transactions, monthRange);
    const spent = monthTotals[budget.categoryId] ?? 0;
    const pctUsed = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
    if (pctUsed >= 85 && pctUsed < 100) {
      const category = getCategoryById(budget.categoryId);
      recommendations.push({
        id: `near-limit-${budget.categoryId}`,
        message: `You are close to exceeding your ${category.name.toLowerCase()} budget.`,
        categoryId: budget.categoryId,
      });
    }
  }

  if (budgets.length === 0 && profile) {
    const avgDaily = getAverageDailySpend(transactions, referenceDate);
    if (avgDaily > 0) {
      recommendations.push({
        id: 'try-daily-limit',
        message: `Try setting a daily spending limit of $${Math.round(avgDaily * 0.85)}.`,
      });
    }
  }

  return recommendations;
}
