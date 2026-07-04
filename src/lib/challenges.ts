import { addDays, daysBetween, fromISODate, startOfDay, toISODate } from '@/lib/dates';
import { filterByRange, getPriorWeeksAverage, sumByType } from '@/lib/totals';
import type { ChallengeInstance, ChallengeProgress, ChallengeTemplate, Transaction, UserProfile } from '@/types';

/**
 * Walks backward from referenceDate to the challenge's start date, counting
 * consecutive days that satisfy `qualifies`, and stopping at the first day that
 * doesn't. Mirrors src/lib/streaks.ts's computeDailyDisciplineStreak walk-back
 * pattern — used for both no_spend_category and the no-category "stay under your
 * daily limit" streak_days template. Because this requires each elapsed day to
 * individually qualify, a challenge can no longer read as "complete" the moment
 * it starts (spend-so-far being $0 on day one no longer implies success — it just
 * means day one qualified, and progress is 1, not the full target).
 */
function countConsecutiveQualifyingDays(start: Date, referenceDate: Date, qualifies: (dateISO: string) => boolean): number {
  const startDay = startOfDay(start);
  const today = startOfDay(referenceDate);
  if (today < startDay) return 0;

  let count = 0;
  let cursor = today;
  while (cursor >= startDay) {
    if (!qualifies(toISODate(cursor))) break;
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function expenseTotalsByDate(transactions: Transaction[], categoryId: string | undefined, range: { start: Date; end: Date }) {
  const totals: Record<string, number> = {};
  for (const t of filterByRange(transactions, range)) {
    if (t.type !== 'expense') continue;
    if (categoryId && t.categoryId !== categoryId) continue;
    totals[t.date] = (totals[t.date] ?? 0) + t.amount;
  }
  return totals;
}

export function computeChallengeProgress(
  instance: ChallengeInstance,
  template: ChallengeTemplate,
  transactions: Transaction[],
  profile: UserProfile | null,
  referenceDate: Date
): ChallengeProgress {
  const start = fromISODate(instance.startDate);
  const end = fromISODate(instance.endDate);
  const effectiveEnd = end < referenceDate ? end : referenceDate;
  const range = { start, end: effectiveEnd };

  let progressValue: number;

  if (template.trackingMode === 'manual') {
    progressValue = instance.checkIns.length;
  } else {
    switch (template.targetType) {
      case 'save_amount': {
        const inRange = filterByRange(transactions, range);
        progressValue = sumByType(inRange, 'income') - sumByType(inRange, 'expense');
        break;
      }
      case 'no_spend_category': {
        const byDate = expenseTotalsByDate(transactions, template.categoryId, range);
        progressValue = countConsecutiveQualifyingDays(start, effectiveEnd, (dateISO) => !byDate[dateISO]);
        break;
      }
      case 'reduce_category_percent': {
        // Prior weekly average is a full week's baseline — prorate it to the
        // fraction of the challenge that has actually elapsed so day one (almost
        // no spend logged yet) isn't compared against a full week's worth of
        // spend, which is what made this look "100% reduced" instantly before.
        const daysElapsed = Math.min(daysBetween(start, effectiveEnd) + 1, template.durationDays);
        const weeklyBaseline = getPriorWeeksAverage(transactions, start, 4, template.categoryId);
        const expectedSoFar = weeklyBaseline * (template.durationDays / 7) * (daysElapsed / template.durationDays);
        const actualSoFar = sumByType(
          filterByRange(transactions, range).filter((t) => t.categoryId === template.categoryId),
          'expense'
        );
        progressValue = expectedSoFar > 0 ? Math.max(0, ((expectedSoFar - actualSoFar) / expectedSoFar) * 100) : 0;
        break;
      }
      case 'streak_days': {
        // Only the no-category "daily limit" template is automatic among
        // streak_days — see trackingMode comments in challenge-templates.ts for
        // why the category-scoped ones (public transport, no ride-share) stay manual.
        const dailyLimit = ((profile?.monthlyIncome ?? 0) * 0.8) / 30;
        const spendByDate = expenseTotalsByDate(transactions, undefined, range);
        progressValue = countConsecutiveQualifyingDays(
          start,
          effectiveEnd,
          (dateISO) => (spendByDate[dateISO] ?? 0) <= dailyLimit
        );
        break;
      }
      case 'count_actions':
        // No count_actions template is automatic today — fall back to check-ins.
        progressValue = instance.checkIns.length;
        break;
    }
  }

  const pctComplete = template.targetValue > 0 ? Math.min(100, (progressValue / template.targetValue) * 100) : 0;

  return {
    instanceId: instance.id,
    progressValue,
    targetValue: template.targetValue,
    pctComplete,
    isComplete: pctComplete >= 100,
  };
}
