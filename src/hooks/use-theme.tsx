/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */
import { createContext, useContext, type ReactNode } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ThemeOverrideContext = createContext<'light' | 'dark' | null>(null);

/**
 * Forces every themed primitive nested inside it (ThemedView, ThemedText, Card,
 * TransactionRow, SectionHeader, etc. — anything reading useTheme()) to render with
 * a fixed color scheme regardless of the system light/dark setting. Used for Home's
 * gradient-hero block, which is dark-only by design rather than theme-toggle-aware.
 */
export function ThemeOverride({ scheme, children }: { scheme: 'light' | 'dark'; children: ReactNode }) {
  return <ThemeOverrideContext.Provider value={scheme}>{children}</ThemeOverrideContext.Provider>;
}

export function useTheme() {
  const override = useContext(ThemeOverrideContext);
  const scheme = useColorScheme();

  return Colors[override ?? (scheme === 'dark' ? 'dark' : 'light')];
}
