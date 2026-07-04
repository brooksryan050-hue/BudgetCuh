export type ID = string;

/** 'YYYY-MM-DD' */
export type ISODate = string;
export type ISODateTime = string;

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other';
export type RecurringInterval = 'weekly' | 'monthly';
export type FinancialGoalType =
  | 'travel'
  | 'emergency_fund'
  | 'rent'
  | 'business'
  | 'school'
  | 'general_savings';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'expired';
export type ChallengeTargetType =
  | 'save_amount'
  | 'no_spend_category'
  | 'reduce_category_percent'
  | 'streak_days'
  | 'count_actions';
export type SavingsGoalCadence = 'weekly' | 'monthly';

export type BadgeKey =
  | 'first_budget_created'
  | 'seven_day_saving_streak'
  | 'no_spend_hero'
  | 'subscription_slayer'
  | 'grocery_master'
  | 'budget_boss'
  | 'emergency_fund_starter'
  | 'thirty_day_money_discipline'
  | 'savings_starter'
  | 'goal_getter'
  | 'challenge_champion'
  | 'century_club'
  | 'big_saver'
  | 'level_5_legend'
  | 'rainy_day_ready'
  | 'steady_saver';

export interface Category {
  id: ID;
  name: string;
  icon: string;
  color: string;
  kind: 'expense' | 'income' | 'both';
  isDefault: boolean;
}

export interface Transaction {
  id: ID;
  amount: number;
  type: TransactionType;
  categoryId: ID;
  date: ISODate;
  notes?: string;
  paymentMethod: PaymentMethod;
  isRecurring: boolean;
  recurringInterval?: RecurringInterval;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Budget {
  id: ID;
  categoryId: ID;
  monthlyLimit: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface UserProfile {
  id: ID;
  name: string;
  currency: string;
  monthlyIncome: number;
  financialGoalType: FinancialGoalType;
  savingsGoalAmount: number;
  savingsGoalCadence: SavingsGoalCadence;
  selectedCategoryIds: ID[];
  dailyReminderEnabled: boolean;
  /** 0-23, local time. */
  dailyReminderHour: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Account {
  id: ID;
  name: string;
  icon: string;
  color: string;
  currency: string;
  balance: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ChallengeTemplate {
  id: ID;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  targetType: ChallengeTargetType;
  targetValue: number;
  categoryId?: ID;
  durationDays: number;
  points: number;
  badgeKey?: BadgeKey;
}

export interface ChallengeInstance {
  id: ID;
  templateId: ID;
  startDate: ISODate;
  endDate: ISODate;
  status: ChallengeStatus;
  checkIns: ISODate[];
  completedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface SavingsGoalContribution {
  id: ID;
  amount: number;
  date: ISODate;
}

export interface SavingsGoal {
  id: ID;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: ISODate;
  financialGoalType?: FinancialGoalType;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  contributions: SavingsGoalContribution[];
}

export interface Badge {
  key: BadgeKey;
  name: string;
  description: string;
  icon: string;
  earnedAt: ISODateTime | null;
}

export interface WeeklySummary {
  id: ID;
  weekStartDate: ISODate;
  weekEndDate: ISODate;
  totalIncome: number;
  totalExpenses: number;
  totalSaved: number;
  moneyHealthScore: number;
  topCategoryId: ID | null;
  insightMessages: string[];
  generatedAt: ISODateTime;
}
