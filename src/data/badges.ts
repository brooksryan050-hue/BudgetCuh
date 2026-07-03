import type { Badge, BadgeKey } from '@/types';

export const BADGE_CATALOG: Badge[] = [
  {
    key: 'first_budget_created',
    name: 'First Budget Created',
    description: 'Set your very first category budget.',
    icon: 'flag',
    earnedAt: null,
  },
  {
    key: 'seven_day_saving_streak',
    name: '7-Day Saving Streak',
    description: 'Stayed under your daily spending limit for 7 days straight.',
    icon: 'flame',
    earnedAt: null,
  },
  {
    key: 'no_spend_hero',
    name: 'No Spend Hero',
    description: 'Went a full week with zero discretionary spending.',
    icon: 'shield-checkmark',
    earnedAt: null,
  },
  {
    key: 'subscription_slayer',
    name: 'Subscription Slayer',
    description: 'Cut down your active recurring subscriptions.',
    icon: 'cut',
    earnedAt: null,
  },
  {
    key: 'grocery_master',
    name: 'Grocery Master',
    description: 'Stayed on budget for groceries 4 weeks in a row.',
    icon: 'basket',
    earnedAt: null,
  },
  {
    key: 'budget_boss',
    name: 'Budget Boss',
    description: 'Finished a full month under every budget.',
    icon: 'trophy',
    earnedAt: null,
  },
  {
    key: 'emergency_fund_starter',
    name: 'Emergency Fund Starter',
    description: 'Reached 10% of your emergency fund goal.',
    icon: 'umbrella',
    earnedAt: null,
  },
  {
    key: 'thirty_day_money_discipline',
    name: '30-Day Money Discipline',
    description: 'Stayed under your daily spending limit for 30 days straight.',
    icon: 'ribbon',
    earnedAt: null,
  },
  {
    key: 'savings_starter',
    name: 'Savings Starter',
    description: 'Made your first contribution to a savings goal.',
    icon: 'sparkles',
    earnedAt: null,
  },
  {
    key: 'goal_getter',
    name: 'Goal Getter',
    description: 'Reached 100% of a savings goal.',
    icon: 'checkmark-done-circle',
    earnedAt: null,
  },
  {
    key: 'challenge_champion',
    name: 'Challenge Champion',
    description: 'Completed 5 savings challenges.',
    icon: 'medal',
    earnedAt: null,
  },
  {
    key: 'century_club',
    name: 'Century Club',
    description: 'Logged 100 transactions.',
    icon: 'receipt',
    earnedAt: null,
  },
  {
    key: 'big_saver',
    name: 'Big Saver',
    description: 'Saved $1,000 or more across your goals.',
    icon: 'cash',
    earnedAt: null,
  },
  {
    key: 'level_5_legend',
    name: 'Level 5 Legend',
    description: 'Reached level 5.',
    icon: 'star',
    earnedAt: null,
  },
  {
    key: 'rainy_day_ready',
    name: 'Rainy Day Ready',
    description: 'Fully funded your emergency fund.',
    icon: 'rainy',
    earnedAt: null,
  },
  {
    key: 'steady_saver',
    name: 'Steady Saver',
    description: 'Saved money 4 weeks in a row.',
    icon: 'trending-up',
    earnedAt: null,
  },
];

export function getBadgeCatalogEntry(key: BadgeKey): Badge {
  return BADGE_CATALOG.find((badge) => badge.key === key)!;
}
