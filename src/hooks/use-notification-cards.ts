import { useEffect } from 'react';

import { generateNotificationCards } from '@/lib/notifications';
import { useBudgetStore } from '@/store/budget-store';

export function useNotificationCards(referenceDate: Date) {
  const transactions = useBudgetStore((s) => s.transactions);
  const budgets = useBudgetStore((s) => s.budgets);
  const profile = useBudgetStore((s) => s.profile);
  const challenges = useBudgetStore((s) => s.challenges);
  const savingsGoals = useBudgetStore((s) => s.savingsGoals);
  const notificationCards = useBudgetStore((s) => s.notificationCards);
  const setNotificationCards = useBudgetStore((s) => s.setNotificationCards);

  useEffect(() => {
    const cards = generateNotificationCards({
      transactions,
      budgets,
      profile,
      challenges,
      savingsGoals,
      referenceDate,
    });
    const existingIds = new Set(notificationCards.map((c) => c.id));
    const merged = [...notificationCards, ...cards.filter((c) => !existingIds.has(c.id))];
    if (merged.length !== notificationCards.length) {
      setNotificationCards(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, budgets, profile, challenges, savingsGoals, referenceDate]);

  return notificationCards.filter((c) => !c.read);
}
