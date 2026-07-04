export type SyncEntity =
  | 'profiles'
  | 'transactions'
  | 'budgets'
  | 'accounts'
  | 'challenge_instances'
  | 'savings_goals'
  | 'savings_goal_contributions'
  | 'user_badges'
  | 'weekly_summaries';

export type SyncOpType = 'upsert' | 'delete';

export interface SyncOp {
  id: string;
  entity: SyncEntity;
  opType: SyncOpType;
  recordId: string;
  /** Full row snapshot for an upsert, in the table's own (snake_case) column shape. Omitted for a delete. */
  payload?: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}
