import type { ChallengeDifficulty } from '@/types';

export const POINTS_BY_DIFFICULTY: Record<ChallengeDifficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 200,
};

/** Total points required to reach the level at each array index (index 0 = level 1). */
export const LEVEL_THRESHOLDS = [0, 250, 600, 1100, 1800, 2700, 3800, 5100, 6600, 8300];

export function levelForPoints(points: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return level;
}

export function pointsForLevel(level: number): number {
  const index = Math.min(Math.max(level - 1, 0), LEVEL_THRESHOLDS.length - 1);
  return LEVEL_THRESHOLDS[index];
}

export function pointsToNextLevel(points: number): { nextLevel: number; pointsNeeded: number; pctToNext: number } {
  const level = levelForPoints(points);
  if (level >= LEVEL_THRESHOLDS.length) {
    return { nextLevel: level, pointsNeeded: 0, pctToNext: 100 };
  }
  const currentFloor = pointsForLevel(level);
  const nextCeiling = LEVEL_THRESHOLDS[level];
  const pctToNext = ((points - currentFloor) / (nextCeiling - currentFloor)) * 100;
  return { nextLevel: level + 1, pointsNeeded: nextCeiling - points, pctToNext: Math.min(100, Math.max(0, pctToNext)) };
}
