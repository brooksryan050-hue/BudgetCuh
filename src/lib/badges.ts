import { DISCRETIONARY_CATEGORY_IDS } from '@/data/categories';
import { addDays, getWeekRange, toISODate } from '@/lib/dates';
import { getBudgetUsages } from '@/lib/budgets';
import { levelForPoints } from '@/lib/gamification';
import { computeDailyDisciplineStreak, computeSavingWeekStreak } from '@/lib/streaks';
import { getCategoryTotals } from '@/lib/totals';
import type {
  Badge,
  BadgeKey,
  Budget,
  ChallengeInstance,
  SavingsGoal,
  Transaction,
  UserProfile,
  WeeklySummary,
} from '@/types';

interface BadgeEvalContext {
  transactions: Transaction[];
  budgets: Budget[];
  profile: UserProfile | null;
  savingsGoals: SavingsGoal[];
  challenges: ChallengeInstance[];
  weeklySummaries: WeeklySummary[];
  points: number;
  badges: Badge[];
  referenceDate: Date;
}

function isEarned(badges: Badge[], key: BadgeKey): boolean {
  return badges.some((badge) => badge.key === key && badge.earnedAt !== null);
}

function hasNoSpendWeek(transactions: Transaction[], referenceDate: Date): boolean {
  const range = getWeekRange(addDays(referenceDate, -7));
  const totals = getCategoryTotals(transactions, range);
  return DISCRETIONARY_CATEGORY_IDS.every((categoryId) => !totals[categoryId]);
}

function isFullyOnBudgetMonth(transactions: Transaction[], budgets: Budget[], referenceDate: Date): boolean {
  if (budgets.length === 0) return false;
  const usages = getBudgetUsages(transactions, budgets, addDays(referenceDate, -30));
  return usages.every((usage) => usage.status !== 'over_budget');
}

function hasFourOnBudgetGroceryWeeks(transactions: Transaction[], budgets: Budget[], referenceDate: Date): boolean {
  const groceryBudget = budgets.find((budget) => budget.categoryId === 'cat-groceries');
  if (!groceryBudget) return false;
  const weeklyLimit = groceryBudget.monthlyLimit / 4;

  for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
    const range = getWeekRange(addDays(referenceDate, -7 * weekOffset));
    const totals = getCategoryTotals(transactions, range);
    if ((totals['cat-groceries'] ?? 0) > weeklyLimit) return false;
  }
  return true;
}

export function evaluateBadges(ctx: BadgeEvalContext): BadgeKey[] {
  const newlyEarned: BadgeKey[] = [];
  const { transactions, budgets, profile, savingsGoals, challenges, weeklySummaries, points, badges, referenceDate } =
    ctx;

  const checks: [BadgeKey, () => boolean][] = [
    ['first_budget_created', () => budgets.length >= 1],
    ['seven_day_saving_streak', () => computeDailyDisciplineStreak(transactions, profile, referenceDate) >= 7],
    ['thirty_day_money_discipline', () => computeDailyDisciplineStreak(transactions, profile, referenceDate) >= 30],
    ['no_spend_hero', () => hasNoSpendWeek(transactions, referenceDate)],
    ['budget_boss', () => isFullyOnBudgetMonth(transactions, budgets, referenceDate)],
    ['grocery_master', () => hasFourOnBudgetGroceryWeeks(transactions, budgets, referenceDate)],
    [
      'emergency_fund_starter',
      () =>
        savingsGoals.some(
          (goal) => goal.financialGoalType === 'emergency_fund' && goal.currentAmount / goal.targetAmount >= 0.1
        ),
    ],
    ['savings_starter', () => savingsGoals.some((goal) => goal.contributions.length > 0)],
    ['goal_getter', () => savingsGoals.some((goal) => goal.currentAmount >= goal.targetAmount)],
    ['challenge_champion', () => challenges.filter((c) => c.status === 'completed').length >= 5],
    ['century_club', () => transactions.length >= 100],
    ['big_saver', () => savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0) >= 1000],
    ['level_5_legend', () => levelForPoints(points) >= 5],
    [
      'rainy_day_ready',
      () =>
        savingsGoals.some(
          (goal) => goal.financialGoalType === 'emergency_fund' && goal.currentAmount >= goal.targetAmount
        ),
    ],
    ['steady_saver', () => computeSavingWeekStreak(weeklySummaries) >= 4],
  ];

  for (const [key, check] of checks) {
    if (!isEarned(badges, key) && check()) {
      newlyEarned.push(key);
    }
  }

  return newlyEarned;
}

export function markBadgesEarned(badges: Badge[], keys: BadgeKey[], referenceDate: Date): Badge[] {
  if (keys.length === 0) return badges;
  const earnedAt = toISODate(referenceDate);
  return badges.map((badge) => (keys.includes(badge.key) ? { ...badge, earnedAt } : badge));
}
