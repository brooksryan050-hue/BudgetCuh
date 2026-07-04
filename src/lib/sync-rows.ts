import type {
  Account,
  Budget,
  ChallengeInstance,
  SavingsGoal,
  SavingsGoalContribution,
  Transaction,
  UserProfile,
  WeeklySummary,
} from '@/types';

/** Maps local (camelCase) entities to their Supabase (snake_case) row shape for an upsert payload. */

export function transactionToRow(t: Transaction, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    amount: t.amount,
    type: t.type,
    category_id: t.categoryId,
    date: t.date,
    notes: t.notes ?? null,
    payment_method: t.paymentMethod,
    is_recurring: t.isRecurring,
    recurring_interval: t.recurringInterval ?? null,
    account_id: t.accountId ?? null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export function budgetToRow(b: Budget, userId: string) {
  return {
    id: b.id,
    user_id: userId,
    category_id: b.categoryId,
    monthly_limit: b.monthlyLimit,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}

export function accountToRow(a: Account, userId: string) {
  return {
    id: a.id,
    user_id: userId,
    name: a.name,
    icon: a.icon,
    color: a.color,
    currency: a.currency,
    balance: a.balance,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

export function challengeInstanceToRow(c: ChallengeInstance, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    template_id: c.templateId,
    start_date: c.startDate,
    end_date: c.endDate,
    status: c.status,
    check_ins: c.checkIns,
    completed_at: c.completedAt ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

export function savingsGoalToRow(g: SavingsGoal, userId: string) {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    icon: g.icon,
    target_amount: g.targetAmount,
    current_amount: g.currentAmount,
    deadline: g.deadline ?? null,
    financial_goal_type: g.financialGoalType ?? null,
    created_at: g.createdAt,
    updated_at: g.updatedAt,
  };
}

export function savingsGoalContributionToRow(
  contribution: SavingsGoalContribution,
  goalId: string,
  userId: string
) {
  return {
    id: contribution.id,
    goal_id: goalId,
    user_id: userId,
    amount: contribution.amount,
    date: contribution.date,
  };
}

export function badgeToRow(badgeKey: string, earnedAt: string, userId: string) {
  return {
    user_id: userId,
    badge_key: badgeKey,
    earned_at: earnedAt,
  };
}

export function weeklySummaryToRow(w: WeeklySummary, userId: string) {
  return {
    id: w.id,
    user_id: userId,
    week_start_date: w.weekStartDate,
    week_end_date: w.weekEndDate,
    total_income: w.totalIncome,
    total_expenses: w.totalExpenses,
    total_saved: w.totalSaved,
    money_health_score: w.moneyHealthScore,
    top_category_id: w.topCategoryId,
    insight_messages: w.insightMessages,
    generated_at: w.generatedAt,
  };
}

export function profileToRow(profile: UserProfile, points: number) {
  return {
    id: profile.id,
    name: profile.name,
    currency: profile.currency,
    monthly_income: profile.monthlyIncome,
    financial_goal_type: profile.financialGoalType,
    savings_goal_amount: profile.savingsGoalAmount,
    savings_goal_cadence: profile.savingsGoalCadence,
    selected_category_ids: profile.selectedCategoryIds,
    daily_reminder_enabled: profile.dailyReminderEnabled,
    daily_reminder_hour: profile.dailyReminderHour,
    push_notifications_enabled: profile.pushNotificationsEnabled,
    expo_push_token: profile.expoPushToken ?? null,
    points,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}
