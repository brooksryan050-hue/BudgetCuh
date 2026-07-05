import type { Category } from '@/types';

/**
 * `icon` names are the outline Ionicons variant everywhere (matching the tab bar's
 * outline/filled convention) — a lighter, more refined line-icon look than the old
 * filled glyphs. `color` stays a distinct hue per category — that's NOT decorative
 * here, it's what makes Trends' donut/bar charts (src/app/(tabs)/trends.tsx) readable;
 * CategoryIcon itself ignores this field and renders monochrome brand-green instead.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-rent', name: 'Rent', icon: 'home-outline', color: '#7C5CFC', kind: 'expense', isDefault: true },
  { id: 'cat-utilities', name: 'Utilities', icon: 'flash-outline', color: '#EAB308', kind: 'expense', isDefault: true },
  { id: 'cat-groceries', name: 'Groceries', icon: 'basket-outline', color: '#1FAA59', kind: 'expense', isDefault: true },
  { id: 'cat-eating-out', name: 'Eating out', icon: 'restaurant-outline', color: '#F5A623', kind: 'expense', isDefault: true },
  { id: 'cat-transport', name: 'Transport', icon: 'bus-outline', color: '#3C87F7', kind: 'expense', isDefault: true },
  { id: 'cat-shopping', name: 'Shopping', icon: 'bag-outline', color: '#E5484D', kind: 'expense', isDefault: true },
  { id: 'cat-online-shopping', name: 'Online Shopping', icon: 'cart-outline', color: '#C026D3', kind: 'expense', isDefault: true },
  { id: 'cat-subscriptions', name: 'Subscriptions', icon: 'repeat-outline', color: '#D6409F', kind: 'expense', isDefault: true },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'film-outline', color: '#F76B15', kind: 'expense', isDefault: true },
  { id: 'cat-health', name: 'Health', icon: 'medkit-outline', color: '#12A594', kind: 'expense', isDefault: true },
  { id: 'cat-education', name: 'Education', icon: 'school-outline', color: '#0091FF', kind: 'expense', isDefault: true },
  { id: 'cat-travel', name: 'Travel', icon: 'airplane-outline', color: '#00A2C7', kind: 'expense', isDefault: true },
  { id: 'cat-family', name: 'Family', icon: 'people-outline', color: '#F5439E', kind: 'expense', isDefault: true },
  { id: 'cat-other', name: 'Other', icon: 'ellipsis-horizontal-outline', color: '#60646C', kind: 'both', isDefault: true },
  { id: 'cat-income', name: 'Income', icon: 'cash-outline', color: '#1FAA59', kind: 'income', isDefault: true },
];

export function getCategoryById(categoryId: string): Category {
  return (
    DEFAULT_CATEGORIES.find((category) => category.id === categoryId) ??
    DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 2]
  );
}

export const DISCRETIONARY_CATEGORY_IDS = ['cat-eating-out', 'cat-shopping', 'cat-online-shopping', 'cat-entertainment'];
