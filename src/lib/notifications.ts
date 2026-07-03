import { getCategoryById } from '@/data/categories';
import { toISODate } from '@/lib/dates';
import { getBudgetUsages } from '@/lib/budgets';
import { getWeeklyTotals } from '@/lib/totals';
import type { Budget, ChallengeInstance, NotificationCard, SavingsGoal, Transaction, UserProfile } from '@/types';

interface NotificationContext {
  transactions: Transaction[];
  budgets: Budget[];
  profile: UserProfile | null;
  challenges: ChallengeInstance[];
  savingsGoals: SavingsGoal[];
  referenceDate: Date;
}

export function generateNotificationCards(ctx: NotificationContext): NotificationCard[] {
  const { transactions, budgets, profile, challenges, savingsGoals, referenceDate } = ctx;
  const dateKey = toISODate(referenceDate);
  const cards: NotificationCard[] = [];

  cards.push({
    id: `daily_checkin-${dateKey}`,
    type: 'daily_checkin',
    title: 'Daily check-in',
    message: "Take a moment to log today's spending — small habits add up.",
    createdAt: referenceDate.toISOString(),
    read: false,
    ctaHref: '/transaction-form',
  });

  if (referenceDate.getDay() === 1) {
    cards.push({
      id: `weekly_review-${dateKey}`,
      type: 'weekly_review',
      title: 'Weekly budget review',
      message: 'A new week has started. Review last week and set an intention for this one.',
      createdAt: referenceDate.toISOString(),
      read: false,
      ctaHref: '/(tabs)/budget',
    });
  }

  if (referenceDate.getDay() === 0) {
    const { income, expenses, saved } = getWeeklyTotals(transactions, referenceDate);
    cards.push({
      id: `end_of_week_summary-${dateKey}`,
      type: 'end_of_week_summary',
      title: 'End of week summary',
      message: `This week: $${income.toFixed(0)} in, $${expenses.toFixed(0)} out, $${saved.toFixed(0)} saved.`,
      createdAt: referenceDate.toISOString(),
      read: false,
      ctaHref: '/(tabs)/trends',
    });
  }

  const activeChallenges = challenges.filter((c) => c.status === 'active');
  for (const instance of activeChallenges) {
    cards.push({
      id: `challenge_reminder-${instance.id}-${dateKey}`,
      type: 'challenge_reminder',
      title: 'Challenge in progress',
      message: 'Keep going on your active challenge — check in and log your progress.',
      createdAt: referenceDate.toISOString(),
      read: false,
      ctaHref: `/challenge/${instance.id}`,
    });
  }

  const usages = getBudgetUsages(transactions, budgets, referenceDate);
  for (const usage of usages) {
    if (usage.status === 'over_budget') {
      const category = getCategoryById(usage.categoryId);
      cards.push({
        id: `overspending_warning-${usage.categoryId}-${dateKey}`,
        type: 'overspending_warning',
        title: 'Overspending warning',
        message: `You're over budget on ${category.name.toLowerCase()} this month.`,
        createdAt: referenceDate.toISOString(),
        read: false,
        ctaHref: '/(tabs)/budget',
      });
    }
  }

  for (const goal of savingsGoals) {
    const pct = (goal.currentAmount / goal.targetAmount) * 100;
    if (pct >= 50 && pct < 100) {
      cards.push({
        id: `goal_progress-${goal.id}-${dateKey}`,
        type: 'goal_progress',
        title: 'Goal progress update',
        message: `You're ${Math.round(pct)}% of the way to your ${goal.name} goal. Keep going.`,
        createdAt: referenceDate.toISOString(),
        read: false,
        ctaHref: '/savings-goals',
      });
    }
  }

  void profile;
  return cards;
}
