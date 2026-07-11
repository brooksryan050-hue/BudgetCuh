import { createContext, useContext, useState } from 'react';
import { Redirect, Stack } from 'expo-router';

import { useSyncBootstrap } from '@/hooks/use-sync-bootstrap';
import { useAuthStore } from '@/store/auth-store';
import { useBudgetStore } from '@/store/budget-store';
import type { FinancialGoalType, SavingsGoalCadence } from '@/types';

export type OnboardingDraft = {
  name: string;
  currency: string;
  monthlyIncome: string;
  accountName: string;
  startingBalance: string;
  selectedCategoryIds: string[];
  financialGoalType: FinancialGoalType | null;
  savingsGoalAmount: string;
  savingsGoalCadence: SavingsGoalCadence;
};

const initialDraft: OnboardingDraft = {
  name: '',
  currency: 'USD',
  monthlyIncome: '',
  accountName: 'Main Account',
  startingBalance: '',
  selectedCategoryIds: [],
  financialGoalType: null,
  savingsGoalAmount: '',
  savingsGoalCadence: 'weekly',
};

const OnboardingDraftContext = createContext<{
  draft: OnboardingDraft;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
} | null>(null);

export function useOnboardingDraft() {
  const ctx = useContext(OnboardingDraftContext);
  if (!ctx) throw new Error('useOnboardingDraft must be used within the onboarding flow');
  return ctx;
}

export default function OnboardingLayout() {
  const session = useAuthStore((s) => s.session);
  const hasCompletedOnboarding = useBudgetStore((s) => s.hasCompletedOnboarding);
  // Frozen at mount on purpose: goal.tsx flips hasCompletedOnboarding to true and then
  // navigates itself (to the post-onboarding paywall) while still mounted under this
  // layout. If this guard reacted to the live value, that store update would force an
  // immediate redirect to (tabs) here, racing goal.tsx's own navigation and winning
  // before it can land. Using the mount-time snapshot means this only redirects a
  // genuinely returning user who deep-links into /onboarding/* after already finishing
  // it in a prior session — not someone finishing it live, right now.
  const [wasAlreadyComplete] = useState(hasCompletedOnboarding);
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);

  function updateDraft(patch: Partial<OnboardingDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  // Disabled here: a user still mid-onboarding has no remote data worth pulling, and
  // (tabs)/_layout.tsx runs its own sync pass once onboarding actually completes.
  useSyncBootstrap(false);

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (wasAlreadyComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <OnboardingDraftContext.Provider value={{ draft, updateDraft }}>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingDraftContext.Provider>
  );
}
