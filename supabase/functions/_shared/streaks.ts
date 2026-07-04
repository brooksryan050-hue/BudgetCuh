// Ported from src/lib/streaks.ts's computeDailyDisciplineStreak, adapted to the raw
// Postgres row shape (snake_case) instead of the client's camelCase Transaction/
// UserProfile types. Logic is unchanged: same 80%-of-daily-income threshold, same
// walk-back-capped-at-account-age guard against a new account claiming a streak
// longer than it has existed.
//
// computeSavingWeekStreak is deliberately NOT ported — it depends on weekly_summaries,
// which is dead/empty in the app today (closeOutWeek is never invoked client-side).

import { addDays, daysBetween, toISODate } from './dates.ts';

export interface StreakTransactionRow {
  type: string;
  amount: number;
  date: string;
}

export function computeDailyDisciplineStreak(
  transactions: StreakTransactionRow[],
  monthlyIncome: number,
  profileCreatedAt: string,
  referenceDate: Date
): number {
  if (!monthlyIncome || monthlyIncome <= 0) return 0;
  const dailyLimit = (monthlyIncome * 0.8) / 30;

  const spendByDate: Record<string, number> = {};
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    spendByDate[transaction.date] = (spendByDate[transaction.date] ?? 0) + transaction.amount;
  }

  const daysSinceCreation = daysBetween(new Date(profileCreatedAt), referenceDate);

  let streak = 0;
  let cursor = addDays(referenceDate, -1);
  for (let i = 0; i < 400 && i < daysSinceCreation; i++) {
    const key = toISODate(cursor);
    const spend = spendByDate[key] ?? 0;
    if (spend <= dailyLimit) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}
