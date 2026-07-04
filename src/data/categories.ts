import type { Category } from '@/types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-rent', name: 'Rent', icon: 'home', color: '#7C5CFC', kind: 'expense', isDefault: true },
  { id: 'cat-utilities', name: 'Utilities', icon: 'flash', color: '#EAB308', kind: 'expense', isDefault: true },
  { id: 'cat-groceries', name: 'Groceries', icon: 'basket', color: '#1FAA59', kind: 'expense', isDefault: true },
  { id: 'cat-eating-out', name: 'Eating out', icon: 'restaurant', color: '#F5A623', kind: 'expense', isDefault: true },
  { id: 'cat-transport', name: 'Transport', icon: 'bus', color: '#3C87F7', kind: 'expense', isDefault: true },
  { id: 'cat-shopping', name: 'Shopping', icon: 'bag', color: '#E5484D', kind: 'expense', isDefault: true },
  { id: 'cat-online-shopping', name: 'Online Shopping', icon: 'cart', color: '#C026D3', kind: 'expense', isDefault: true },
  { id: 'cat-subscriptions', name: 'Subscriptions', icon: 'repeat', color: '#D6409F', kind: 'expense', isDefault: true },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'film', color: '#F76B15', kind: 'expense', isDefault: true },
  { id: 'cat-health', name: 'Health', icon: 'medkit', color: '#12A594', kind: 'expense', isDefault: true },
  { id: 'cat-education', name: 'Education', icon: 'school', color: '#0091FF', kind: 'expense', isDefault: true },
  { id: 'cat-travel', name: 'Travel', icon: 'airplane', color: '#00A2C7', kind: 'expense', isDefault: true },
  { id: 'cat-family', name: 'Family', icon: 'people', color: '#F5439E', kind: 'expense', isDefault: true },
  { id: 'cat-other', name: 'Other', icon: 'ellipsis-horizontal', color: '#60646C', kind: 'both', isDefault: true },
  { id: 'cat-income', name: 'Income', icon: 'cash', color: '#1FAA59', kind: 'income', isDefault: true },
];

export function getCategoryById(categoryId: string): Category {
  return (
    DEFAULT_CATEGORIES.find((category) => category.id === categoryId) ??
    DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 2]
  );
}

export const DISCRETIONARY_CATEGORY_IDS = ['cat-eating-out', 'cat-shopping', 'cat-online-shopping', 'cat-entertainment'];
