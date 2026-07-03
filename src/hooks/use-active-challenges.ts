import { useMemo } from 'react';

import { getChallengeTemplateById } from '@/data/challenge-templates';
import { computeChallengeProgress } from '@/lib/challenges';
import { useBudgetStore } from '@/store/budget-store';

export function useChallengesWithProgress(referenceDate: Date) {
  const challenges = useBudgetStore((s) => s.challenges);
  const transactions = useBudgetStore((s) => s.transactions);

  return useMemo(
    () =>
      challenges
        .map((instance) => {
          const template = getChallengeTemplateById(instance.templateId);
          if (!template) return null;
          const progress = computeChallengeProgress(instance, template, transactions, referenceDate);
          return { instance, template, progress };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [challenges, transactions, referenceDate]
  );
}
