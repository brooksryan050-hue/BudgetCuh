// Duplicated from src/data/categories.ts (id/name only) — categories aren't a synced
// table, so this Deno function can't import the client copy. Update both if a
// category is renamed. Icons/colors are omitted since they aren't needed for prompt
// text.

export const CATEGORY_NAMES: Record<string, string> = {
  'cat-rent': 'Rent',
  'cat-utilities': 'Utilities',
  'cat-groceries': 'Groceries',
  'cat-eating-out': 'Eating out',
  'cat-transport': 'Transport',
  'cat-shopping': 'Shopping',
  'cat-online-shopping': 'Online Shopping',
  'cat-subscriptions': 'Subscriptions',
  'cat-entertainment': 'Entertainment',
  'cat-health': 'Health',
  'cat-education': 'Education',
  'cat-travel': 'Travel',
  'cat-family': 'Family',
  'cat-other': 'Other',
  'cat-income': 'Income',
};

export function categoryName(categoryId: string): string {
  return CATEGORY_NAMES[categoryId] ?? 'Other';
}

// Same list as src/data/categories.ts's DISCRETIONARY_CATEGORY_IDS — used to pick the
// "which discretionary category spiked" angle for reflections.
export const DISCRETIONARY_CATEGORY_IDS = [
  'cat-eating-out',
  'cat-shopping',
  'cat-online-shopping',
  'cat-entertainment',
];

// Same list as src/data/categories.ts's implicit "fixed/recurring" categories — used
// to identify which categories were most consistent across the period.
export const RECURRING_CATEGORY_IDS = ['cat-rent', 'cat-utilities', 'cat-groceries', 'cat-subscriptions'];
