import { useMemo } from 'react';

import { levelForPoints, pointsToNextLevel } from '@/lib/gamification';
import { useBudgetStore } from '@/store/budget-store';

export function useLevel() {
  const points = useBudgetStore((s) => s.points);
  return useMemo(() => {
    const level = levelForPoints(points);
    const next = pointsToNextLevel(points);
    return { points, level, ...next };
  }, [points]);
}
