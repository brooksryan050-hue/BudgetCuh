export interface LevelCharacter {
  level: number;
  emoji: string;
  name: string;
  tagline: string;
}

/** One entry per level in `LEVEL_THRESHOLDS` (src/lib/gamification.ts). */
export const LEVEL_CHARACTERS: LevelCharacter[] = [
  { level: 1, emoji: '🐣', name: 'Baby Saver', tagline: 'Just getting started' },
  { level: 2, emoji: '🐷', name: 'Penny Pig', tagline: 'Building the habit' },
  { level: 3, emoji: '🦊', name: 'Clever Fox', tagline: 'Smart with money' },
  { level: 4, emoji: '🦉', name: 'Wise Owl', tagline: 'Budgeting wisdom' },
  { level: 5, emoji: '🦁', name: 'Money Lion', tagline: 'Bold saver' },
  { level: 6, emoji: '🐯', name: 'Savings Tiger', tagline: 'Fierce discipline' },
  { level: 7, emoji: '🦅', name: 'Budget Eagle', tagline: 'Eyes on the goal' },
  { level: 8, emoji: '🐉', name: 'Wealth Dragon', tagline: 'Guarding the hoard' },
  { level: 9, emoji: '👑', name: 'Finance Royalty', tagline: 'Mastered the game' },
  { level: 10, emoji: '🏆', name: 'Money Legend', tagline: 'Top of the leaderboard' },
];

export function getLevelCharacter(level: number): LevelCharacter {
  const index = Math.min(Math.max(level - 1, 0), LEVEL_CHARACTERS.length - 1);
  return LEVEL_CHARACTERS[index];
}
