import { fromISODate } from '@/lib/dates';
import { filterByRange, getPriorWeeksAverage, sumByType } from '@/lib/totals';
import type { ChallengeInstance, ChallengeProgress, ChallengeTemplate, Transaction } from '@/types';

export function computeChallengeProgress(
  instance: ChallengeInstance,
  template: ChallengeTemplate,
  transactions: Transaction[],
  referenceDate: Date
): ChallengeProgress {
  const start = fromISODate(instance.startDate);
  const end = fromISODate(instance.endDate);
  const range = { start, end: end < referenceDate ? end : referenceDate };

  let progressValue = 0;

  switch (template.targetType) {
    case 'save_amount': {
      const inRange = filterByRange(transactions, range);
      progressValue = sumByType(inRange, 'income') - sumByType(inRange, 'expense');
      break;
    }
    case 'no_spend_category': {
      const spend = sumByType(
        filterByRange(transactions, range).filter((t) => t.categoryId === template.categoryId),
        'expense'
      );
      progressValue = spend === 0 ? template.targetValue : 0;
      break;
    }
    case 'reduce_category_percent': {
      const priorAvg = getPriorWeeksAverage(transactions, start, 1, template.categoryId);
      const spend = sumByType(
        filterByRange(transactions, range).filter((t) => t.categoryId === template.categoryId),
        'expense'
      );
      if (priorAvg <= 0) {
        progressValue = 0;
      } else {
        const pctReduced = ((priorAvg - spend) / priorAvg) * 100;
        progressValue = Math.max(0, pctReduced);
      }
      break;
    }
    case 'streak_days':
    case 'count_actions': {
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
