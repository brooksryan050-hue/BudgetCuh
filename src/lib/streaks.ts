import { addDays, daysBetween, toISODate } from '@/lib/dates';
import type { Transaction, UserProfile, WeeklySummary } from '@/types';

export function computeDailyDisciplineStreak(
  transactions: Transaction[],
  profile: UserProfile | null,
  referenceDate: Date
): number {
  if (!profile || profile.monthlyIncome <= 0) return 0;
  const dailyLimit = (profile.monthlyIncome * 0.8) / 30;

  const spendByDate: Record<string, number> = {};
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    spendByDate[transaction.date] = (spendByDate[transaction.date] ?? 0) + transaction.amount;
  }

  // A day with no logged spend looks identical to a day that simply hasn't happened
  // yet for this account — cap the walk-back at the account's actual age so a
  // brand-new profile can't claim a streak longer than it has existed.
  const daysSinceCreation = daysBetween(new Date(profile.createdAt), referenceDate);

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

export function computeSavingWeekStreak(weeklySummaries: WeeklySummary[]): number {
  const sorted = [...weeklySummaries].sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1));
  let streak = 0;
  for (const summary of sorted) {
    if (summary.totalSaved > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}
