import type { ID, ISODateTime } from './models';

export interface MoneyHealthBreakdown {
  score: number;
  savingRateScore: number;
  budgetAdherenceScore: number;
  overspendingScore: number;
  trendScore: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs attention';
}

export type InsightSeverity = 'positive' | 'neutral' | 'warning';

export interface Insight {
  id: string;
  message: string;
  severity: InsightSeverity;
  categoryId?: ID;
}

export interface Recommendation {
  id: string;
  message: string;
  potentialSavings?: number;
  categoryId?: ID;
}

export type NotificationType =
  | 'daily_checkin'
  | 'weekly_review'
  | 'challenge_reminder'
  | 'overspending_warning'
  | 'goal_progress'
  | 'end_of_week_summary';

export interface NotificationCard {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: ISODateTime;
  read: boolean;
  ctaHref?: string;
}

export type BudgetUsageStatus = 'ok' | 'near_limit' | 'over_budget';

export interface BudgetUsage {
  budgetId: ID;
  categoryId: ID;
  limit: number;
  spent: number;
  remaining: number;
  pctUsed: number;
  status: BudgetUsageStatus;
}

export interface ChallengeProgress {
  instanceId: ID;
  progressValue: number;
  targetValue: number;
  pctComplete: number;
  isComplete: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}
