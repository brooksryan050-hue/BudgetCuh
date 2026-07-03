import { getChallengeTemplateById } from '@/data/challenge-templates';
import { addDays, getWeekRange, toISODate } from '@/lib/dates';
import { computeMoneyHealthScore } from '@/lib/money-health';
import type {
  Account,
  Badge,
  Budget,
  ChallengeInstance,
  SavingsGoal,
  Transaction,
  UserProfile,
  WeeklySummary,
} from '@/types';

/** Deterministic PRNG so seeded demo data is reproducible run-to-run. */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

const EXPENSE_WEIGHTS: { categoryId: string; weight: number; min: number; max: number }[] = [
  { categoryId: 'cat-groceries', weight: 3, min: 15, max: 60 },
  { categoryId: 'cat-eating-out', weight: 2, min: 8, max: 35 },
  { categoryId: 'cat-transport', weight: 2, min: 5, max: 25 },
  { categoryId: 'cat-shopping', weight: 1.5, min: 15, max: 80 },
  { categoryId: 'cat-entertainment', weight: 1, min: 10, max: 40 },
  { categoryId: 'cat-health', weight: 0.5, min: 15, max: 60 },
  { categoryId: 'cat-family', weight: 0.5, min: 10, max: 50 },
];

interface SeedBundle {
  transactions: Transaction[];
  budgets: Budget[];
  challenges: ChallengeInstance[];
  savingsGoals: SavingsGoal[];
  badges: Badge[];
  weeklySummaries: WeeklySummary[];
  accounts: Account[];
}

export function buildSeedData(profile: UserProfile, referenceDate: Date): SeedBundle {
  idCounter = 0;
  const random = mulberry32(42);
  const transactions: Transaction[] = [];
  const now = referenceDate.toISOString();

  const weeksBack = 8;
  const rangeStart = addDays(referenceDate, -weeksBack * 7);

  const selectedExpenseCategories = EXPENSE_WEIGHTS.filter((entry) =>
    profile.selectedCategoryIds.length === 0 ? true : profile.selectedCategoryIds.includes(entry.categoryId)
  );
  const activeExpenseCategories = selectedExpenseCategories.length > 0 ? selectedExpenseCategories : EXPENSE_WEIGHTS;

  // Recurring income: biweekly paycheck.
  for (let day = 0; day <= weeksBack * 7; day += 14) {
    const date = addDays(rangeStart, day);
    if (date > referenceDate) continue;
    transactions.push({
      id: nextId('txn'),
      amount: Math.round((profile.monthlyIncome / 2) * 100) / 100,
      type: 'income',
      categoryId: 'cat-income',
      date: toISODate(date),
      notes: 'Paycheck',
      paymentMethod: 'bank_transfer',
      isRecurring: true,
      recurringInterval: 'monthly',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Recurring rent: 1st-of-month equivalent, every 30 days.
  const rentAmount = Math.round(profile.monthlyIncome * 0.3 * 100) / 100;
  for (let day = 0; day <= weeksBack * 7; day += 30) {
    const date = addDays(rangeStart, day);
    if (date > referenceDate) continue;
    transactions.push({
      id: nextId('txn'),
      amount: rentAmount,
      type: 'expense',
      categoryId: 'cat-rent',
      date: toISODate(date),
      notes: 'Rent',
      paymentMethod: 'bank_transfer',
      isRecurring: true,
      recurringInterval: 'monthly',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Recurring utilities bill, monthly.
  const utilitiesAmount = Math.round(profile.monthlyIncome * 0.06 * 100) / 100;
  for (let day = 5; day <= weeksBack * 7; day += 30) {
    const date = addDays(rangeStart, day);
    if (date > referenceDate) continue;
    transactions.push({
      id: nextId('txn'),
      amount: utilitiesAmount,
      type: 'expense',
      categoryId: 'cat-utilities',
      date: toISODate(date),
      notes: 'Utilities',
      paymentMethod: 'bank_transfer',
      isRecurring: true,
      recurringInterval: 'monthly',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Two recurring subscriptions, monthly.
  const subscriptionAmounts = [9.99, 15.99];
  for (const amount of subscriptionAmounts) {
    for (let day = 3; day <= weeksBack * 7; day += 30) {
      const date = addDays(rangeStart, day);
      if (date > referenceDate) continue;
      transactions.push({
        id: nextId('txn'),
        amount,
        type: 'expense',
        categoryId: 'cat-subscriptions',
        date: toISODate(date),
        notes: 'Subscription',
        paymentMethod: 'card',
        isRecurring: true,
        recurringInterval: 'monthly',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Weighted random expenses, 4-8 per week, with one grocery-spike week and one no-eating-out week.
  const totalWeight = activeExpenseCategories.reduce((sum, c) => sum + c.weight, 0);
  const spikeWeekIndex = 2;
  const noEatingOutWeekIndex = 5;

  for (let week = 0; week < weeksBack; week++) {
    const weekStart = addDays(rangeStart, week * 7);
    const transactionsThisWeek = 4 + Math.floor(random() * 5);

    for (let i = 0; i < transactionsThisWeek; i++) {
      const date = addDays(weekStart, Math.floor(random() * 7));
      if (date > referenceDate) continue;

      let roll = random() * totalWeight;
      let chosen = activeExpenseCategories[0];
      for (const entry of activeExpenseCategories) {
        if (roll < entry.weight) {
          chosen = entry;
          break;
        }
        roll -= entry.weight;
      }

      if (week === noEatingOutWeekIndex && chosen.categoryId === 'cat-eating-out') continue;

      let amount = chosen.min + random() * (chosen.max - chosen.min);
      if (week === spikeWeekIndex && chosen.categoryId === 'cat-groceries') {
        amount *= 1.8;
      }

      transactions.push({
        id: nextId('txn'),
        amount: Math.round(amount * 100) / 100,
        type: 'expense',
        categoryId: chosen.categoryId,
        date: toISODate(date),
        paymentMethod: random() > 0.5 ? 'card' : 'cash',
        isRecurring: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  transactions.sort((a, b) => (a.date < b.date ? -1 : 1));

  // Budgets on 4-5 categories, set slightly under seeded averages.
  const budgetCategoryIds = [
    'cat-groceries',
    'cat-eating-out',
    'cat-transport',
    'cat-shopping',
    'cat-subscriptions',
    'cat-utilities',
  ];
  const budgets: Budget[] = budgetCategoryIds.map((categoryId) => {
    const spendForCategory = transactions
      .filter((t) => t.categoryId === categoryId && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const weeklyAvg = spendForCategory / weeksBack;
    const monthlyLimit = Math.max(30, Math.round(weeklyAvg * 4 * 0.9));
    return {
      id: nextId('budget'),
      categoryId,
      monthlyLimit,
      createdAt: now,
      updatedAt: now,
    };
  });

  // Challenges: one completed 2 weeks ago, one or two active.
  const completedTemplate = getChallengeTemplateById('tpl-save-50-sunday')!;
  const completedStart = addDays(referenceDate, -14);
  const challenges: ChallengeInstance[] = [
    {
      id: nextId('challenge'),
      templateId: completedTemplate.id,
      startDate: toISODate(completedStart),
      endDate: toISODate(addDays(completedStart, completedTemplate.durationDays)),
      status: 'completed',
      checkIns: [],
      completedAt: addDays(completedStart, completedTemplate.durationDays).toISOString(),
    },
    {
      id: nextId('challenge'),
      templateId: 'tpl-no-eating-out-5',
      startDate: toISODate(addDays(referenceDate, -2)),
      endDate: toISODate(addDays(referenceDate, 3)),
      status: 'active',
      checkIns: [],
    },
  ];

  // Savings goals: one matching financial goal type, one Emergency Fund.
  const goalNameByType: Record<string, string> = {
    travel: 'Dream Vacation',
    emergency_fund: 'Emergency Fund',
    rent: 'Rent Cushion',
    business: 'Business Fund',
    school: 'Tuition Fund',
    general_savings: 'General Savings',
  };
  const goalIconByType: Record<string, string> = {
    travel: 'airplane',
    emergency_fund: 'umbrella',
    rent: 'home',
    business: 'briefcase',
    school: 'school',
    general_savings: 'wallet',
  };

  const primaryGoalTarget = Math.max(500, Math.round(profile.savingsGoalAmount * 8));
  const primaryGoal: SavingsGoal = {
    id: nextId('goal'),
    name: goalNameByType[profile.financialGoalType] ?? 'Savings Goal',
    icon: goalIconByType[profile.financialGoalType] ?? 'wallet',
    targetAmount: primaryGoalTarget,
    currentAmount: Math.round(primaryGoalTarget * 0.28),
    deadline: toISODate(addDays(referenceDate, 120)),
    financialGoalType: profile.financialGoalType,
    createdAt: now,
    contributions: [
      { id: nextId('contrib'), amount: Math.round(primaryGoalTarget * 0.15), date: toISODate(addDays(referenceDate, -30)) },
      { id: nextId('contrib'), amount: Math.round(primaryGoalTarget * 0.13), date: toISODate(addDays(referenceDate, -10)) },
    ],
  };

  const savingsGoals: SavingsGoal[] = [primaryGoal];

  if (profile.financialGoalType !== 'emergency_fund') {
    const emergencyTarget = Math.max(600, Math.round(profile.monthlyIncome * 2));
    savingsGoals.push({
      id: nextId('goal'),
      name: 'Emergency Fund',
      icon: 'umbrella',
      targetAmount: emergencyTarget,
      currentAmount: Math.round(emergencyTarget * 0.04),
      financialGoalType: 'emergency_fund',
      createdAt: now,
      contributions: [
        { id: nextId('contrib'), amount: Math.round(emergencyTarget * 0.04), date: toISODate(addDays(referenceDate, -20)) },
      ],
    });
  }

  // Badges: catalog with the completed challenge's badge marked earned (none by default here).
  const badges: Badge[] = [];

  // Weekly summaries, backfilled by running real totals/score functions over seeded transactions.
  const weeklySummaries: WeeklySummary[] = [];
  for (let week = weeksBack - 1; week >= 1; week--) {
    const weekReference = addDays(referenceDate, -week * 7);
    const { start, end } = getWeekRange(weekReference);
    const weekTransactions = transactions.filter((t) => t.date >= toISODate(start) && t.date <= toISODate(end));
    const income = weekTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = weekTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const categoryTotals: Record<string, number> = {};
    for (const t of weekTransactions) {
      if (t.type !== 'expense') continue;
      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] ?? 0) + t.amount;
    }
    const topCategoryId =
      Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const breakdown = computeMoneyHealthScore(transactions, budgets, profile, end);

    weeklySummaries.push({
      id: nextId('summary'),
      weekStartDate: toISODate(start),
      weekEndDate: toISODate(end),
      totalIncome: income,
      totalExpenses: expenses,
      totalSaved: income - expenses,
      moneyHealthScore: breakdown.score,
      topCategoryId,
      insightMessages: [],
      generatedAt: end.toISOString(),
    });
  }

  // One default account, balance derived from the seeded transaction history but
  // editable from here on — there's no real bank connection to keep it in sync with.
  const netFromTransactions = transactions.reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
    0
  );
  const accounts: Account[] = [
    {
      id: nextId('account'),
      name: 'Main Account',
      icon: 'wallet',
      color: '#3C87F7',
      currency: profile.currency,
      balance: Math.round(netFromTransactions * 100) / 100,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return { transactions, budgets, challenges, savingsGoals, badges, weeklySummaries, accounts };
}
