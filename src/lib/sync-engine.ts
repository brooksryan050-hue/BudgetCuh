import { supabase } from '@/lib/supabase';
import type { SyncEntity, SyncOp } from '@/types/sync';

const TABLE_BY_ENTITY: Record<SyncEntity, string> = {
  profiles: 'profiles',
  transactions: 'transactions',
  budgets: 'budgets',
  accounts: 'accounts',
  challenge_instances: 'challenge_instances',
  savings_goals: 'savings_goals',
  savings_goal_contributions: 'savings_goal_contributions',
  user_badges: 'user_badges',
  weekly_summaries: 'weekly_summaries',
};

/**
 * Pushes queued local mutations to Supabase, oldest first. Stops at the first
 * failure (network down, etc.) rather than skipping ahead, so the remaining queue
 * stays intact and gets retried whole on the next trigger — no per-op backoff for v1,
 * which is fine at this app's scale (single user, personal finance, small queues).
 * Returns the ops that were *not* successfully flushed (empty array = fully flushed).
 */
export async function flushOutbox(ops: SyncOp[]): Promise<SyncOp[]> {
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const table = TABLE_BY_ENTITY[op.entity];

    if (op.opType === 'upsert' && !op.payload) {
      continue; // malformed op, nothing to push — skip rather than stall the whole queue
    }

    const { error } =
      op.opType === 'delete'
        ? await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', op.recordId)
        : await supabase.from(table).upsert(op.payload!);

    if (error) {
      return ops.slice(i);
    }
  }
  return [];
}

// Both the per-mutation "immediate flush" and the bootstrap's flush-then-pull pass can
// fire close together (e.g. adding a transaction right as the app comes back online);
// without this, two overlapping flushOutbox calls could each compute "remaining ops"
// from a stale snapshot and one would clobber the other's result via setState. `null`
// return means "skipped, a flush was already running" — callers should leave the
// outbox untouched and let the in-flight pass's own result apply.
let flushInFlight = false;

export async function flushOutboxGuarded(ops: SyncOp[]): Promise<SyncOp[] | null> {
  if (flushInFlight) return null;
  flushInFlight = true;
  try {
    return await flushOutbox(ops);
  } finally {
    flushInFlight = false;
  }
}

/** Full-table pull per synced entity, scoped to the signed-in user via RLS. Not incremental for v1. */
export async function pullRemoteChanges(userId: string): Promise<Record<SyncEntity, Record<string, unknown>[]>> {
  const [
    profiles,
    transactions,
    budgets,
    accounts,
    challengeInstances,
    savingsGoals,
    savingsGoalContributions,
    userBadges,
    weeklySummaries,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('budgets').select('*').eq('user_id', userId),
    supabase.from('accounts').select('*').eq('user_id', userId),
    supabase.from('challenge_instances').select('*').eq('user_id', userId),
    supabase.from('savings_goals').select('*').eq('user_id', userId),
    supabase.from('savings_goal_contributions').select('*').eq('user_id', userId),
    supabase.from('user_badges').select('*').eq('user_id', userId),
    supabase.from('weekly_summaries').select('*').eq('user_id', userId),
  ]);

  return {
    profiles: profiles.data ?? [],
    transactions: transactions.data ?? [],
    budgets: budgets.data ?? [],
    accounts: accounts.data ?? [],
    challenge_instances: challengeInstances.data ?? [],
    savings_goals: savingsGoals.data ?? [],
    savings_goal_contributions: savingsGoalContributions.data ?? [],
    user_badges: userBadges.data ?? [],
    weekly_summaries: weeklySummaries.data ?? [],
  };
}
