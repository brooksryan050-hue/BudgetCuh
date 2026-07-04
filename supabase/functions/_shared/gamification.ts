// Ported from src/lib/gamification.ts's levelForPoints/LEVEL_THRESHOLDS (zero deps,
// byte-for-byte copy) — used to give nudge copy a natural reference to the user's level.

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
