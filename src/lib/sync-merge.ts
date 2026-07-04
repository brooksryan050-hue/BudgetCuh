import { BADGE_MIN_ACCOUNT_AGE_DAYS } from '@/lib/badges';
import { addDays } from '@/lib/dates';
import type {
  Account,
  Badge,
  Budget,
  ChallengeInstance,
  SavingsGoal,
  SavingsGoalContribution,
  Transaction,
  UserProfile,
  WeeklySummary,
} from '@/types';
import type { SyncEntity } from '@/types/sync';

type Row = Record<string, unknown>;

export type RemoteSnapshot = Record<SyncEntity, Row[]>;

export interface LocalSyncState {
  profile: UserProfile | null;
  hasCompletedOnboarding: boolean;
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  challenges: ChallengeInstance[];
  savingsGoals: SavingsGoal[];
  badges: Badge[];
  weeklySummaries: WeeklySummary[];
  points: number;
}

/**
 * Generic last-write-wins union by id for mutable, individually-editable entities.
 * Local-only rows that haven't flushed yet are always kept (they're simply absent
 * from `remoteRows`, never a signal to delete). A remote row with `deleted_at` set
 * is the only thing that removes a locally-present row.
 */
function mergeMutable<T extends { id: string; updatedAt: string }>(
  local: T[],
  remoteRows: Row[],
  rowToEntity: (row: Row) => T
): T[] {
  const merged = new Map(local.map((item) => [item.id, item]));

  for (const row of remoteRows) {
    const id = row.id as string;
    if (row.deleted_at) {
      merged.delete(id);
      continue;
    }
    const existing = merged.get(id);
    const remoteUpdatedAt = row.updated_at as string;
    if (!existing || new Date(remoteUpdatedAt) > new Date(existing.updatedAt)) {
      merged.set(id, rowToEntity(row));
    }
  }

  return Array.from(merged.values());
}

/** Plain union by id, no timestamp comparison — the app never edits or deletes these once created. */
function mergeAppendOnly<T extends { id: string }>(
  local: T[],
  remoteRows: Row[],
  rowToEntity: (row: Row) => T
): T[] {
  const merged = new Map(local.map((item) => [item.id, item]));
  for (const row of remoteRows) {
    const id = row.id as string;
    if (!merged.has(id)) merged.set(id, rowToEntity(row));
  }
  return Array.from(merged.values());
}

function rowToTransaction(row: Row): Transaction {
  return {
    id: row.id as string,
    amount: Number(row.amount),
    type: row.type as Transaction['type'],
    categoryId: row.category_id as string,
    date: row.date as string,
    notes: (row.notes as string | null) ?? undefined,
    paymentMethod: row.payment_method as Transaction['paymentMethod'],
    isRecurring: row.is_recurring as boolean,
    recurringInterval: (row.recurring_interval as Transaction['recurringInterval'] | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToBudget(row: Row): Budget {
  return {
    id: row.id as string,
    categoryId: row.category_id as string,
    monthlyLimit: Number(row.monthly_limit),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToAccount(row: Row): Account {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    color: row.color as string,
    currency: row.currency as string,
    balance: Number(row.balance),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToChallengeInstance(row: Row): ChallengeInstance {
  return {
    id: row.id as string,
    templateId: row.template_id as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    status: row.status as ChallengeInstance['status'],
    checkIns: (row.check_ins as string[] | null) ?? [],
    completedAt: (row.completed_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToWeeklySummary(row: Row): WeeklySummary {
  return {
    id: row.id as string,
    weekStartDate: row.week_start_date as string,
    weekEndDate: row.week_end_date as string,
    totalIncome: Number(row.total_income),
    totalExpenses: Number(row.total_expenses),
    totalSaved: Number(row.total_saved),
    moneyHealthScore: Number(row.money_health_score),
    topCategoryId: (row.top_category_id as string | null) ?? null,
    insightMessages: (row.insight_messages as string[] | null) ?? [],
    generatedAt: row.generated_at as string,
  };
}

function rowToProfile(row: Row): UserProfile {
  return {
    id: row.id as string,
    name: row.name as string,
    currency: row.currency as string,
    monthlyIncome: Number(row.monthly_income),
    financialGoalType: row.financial_goal_type as UserProfile['financialGoalType'],
    savingsGoalAmount: Number(row.savings_goal_amount),
    savingsGoalCadence: row.savings_goal_cadence as UserProfile['savingsGoalCadence'],
    selectedCategoryIds: (row.selected_category_ids as string[] | null) ?? [],
    dailyReminderEnabled: row.daily_reminder_enabled as boolean,
    dailyReminderHour: row.daily_reminder_hour as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSavingsGoal(row: Row, contributions: SavingsGoalContribution[]): SavingsGoal {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    deadline: (row.deadline as string | null) ?? undefined,
    financialGoalType: (row.financial_goal_type as SavingsGoal['financialGoalType'] | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    contributions,
  };
}

function mergeSavingsGoals(
  localGoals: SavingsGoal[],
  remoteGoalRows: Row[],
  remoteContributionRows: Row[]
): SavingsGoal[] {
  const merged = new Map(localGoals.map((goal) => [goal.id, goal]));

  for (const row of remoteGoalRows) {
    const id = row.id as string;
    if (row.deleted_at) {
      merged.delete(id);
      continue;
    }
    const existing = merged.get(id);
    const remoteUpdatedAt = row.updated_at as string;
    if (!existing || new Date(remoteUpdatedAt) > new Date(existing.updatedAt)) {
      merged.set(id, rowToSavingsGoal(row, existing?.contributions ?? []));
    }
  }

  // Union contributions per goal (append-only) regardless of which side won the base fields.
  const contributionsByGoal = new Map<string, SavingsGoalContribution[]>();
  for (const goal of merged.values()) contributionsByGoal.set(goal.id, [...goal.contributions]);
  for (const row of remoteContributionRows) {
    const goalId = row.goal_id as string;
    const existing = contributionsByGoal.get(goalId);
    if (!existing) continue;
    if (!existing.some((c) => c.id === row.id)) {
      existing.push({ id: row.id as string, amount: Number(row.amount), date: row.date as string });
    }
  }

  return Array.from(merged.values()).map((goal) => ({
    ...goal,
    contributions: contributionsByGoal.get(goal.id) ?? goal.contributions,
  }));
}

/**
 * Coalesces earned state onto the local, catalog-shaped badge list — never reverts an
 * earned badge to unearned. A remote earned_at that predates the account being old
 * enough to legitimately qualify (see BADGE_MIN_ACCOUNT_AGE_DAYS) is rejected outright
 * rather than adopted — otherwise a row synced before that gate existed would just
 * resurrect the bug on every pull, even after the local copy has been corrected.
 */
function mergeBadges(localBadges: Badge[], remoteRows: Row[], profile: UserProfile | null): Badge[] {
  const remoteEarnedAtByKey = new Map(remoteRows.map((row) => [row.badge_key as string, row.earned_at as string]));
  const createdAt = profile ? new Date(profile.createdAt) : null;

  return localBadges.map((badge) => {
    const remoteEarnedAt = remoteEarnedAtByKey.get(badge.key);
    if (!remoteEarnedAt) return badge;

    const minAgeDays = BADGE_MIN_ACCOUNT_AGE_DAYS[badge.key];
    if (minAgeDays && createdAt && new Date(remoteEarnedAt) < addDays(createdAt, minAgeDays)) {
      return badge; // stale/buggy remote earn — don't propagate it locally
    }

    if (!badge.earnedAt) return { ...badge, earnedAt: remoteEarnedAt };
    return new Date(remoteEarnedAt) < new Date(badge.earnedAt) ? { ...badge, earnedAt: remoteEarnedAt } : badge;
  });
}

export function mergeRemoteSnapshot(local: LocalSyncState, remote: RemoteSnapshot): Partial<LocalSyncState> {
  const patch: Partial<LocalSyncState> = {
    transactions: mergeMutable(local.transactions, remote.transactions, rowToTransaction),
    budgets: mergeMutable(local.budgets, remote.budgets, rowToBudget),
    accounts: mergeMutable(local.accounts, remote.accounts, rowToAccount),
    challenges: mergeMutable(local.challenges, remote.challenge_instances, rowToChallengeInstance),
    savingsGoals: mergeSavingsGoals(local.savingsGoals, remote.savings_goals, remote.savings_goal_contributions),
    weeklySummaries: mergeAppendOnly(local.weeklySummaries, remote.weekly_summaries, rowToWeeklySummary),
    badges: mergeBadges(local.badges, remote.user_badges, local.profile),
  };

  const remoteProfileRow = remote.profiles[0];
  if (remoteProfileRow) {
    const remoteUpdatedAt = remoteProfileRow.updated_at as string;
    const remoteWins = !local.profile || new Date(remoteUpdatedAt) > new Date(local.profile.updatedAt);
    if (remoteWins) {
      patch.profile = rowToProfile(remoteProfileRow);
      patch.points = Number(remoteProfileRow.points);
    }
    if (!local.hasCompletedOnboarding) {
      patch.hasCompletedOnboarding = true;
    }
  }

  return patch;
}
