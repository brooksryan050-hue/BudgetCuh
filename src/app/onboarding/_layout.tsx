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

  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <OnboardingDraftContext.Provider value={{ draft, updateDraft }}>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingDraftContext.Provider>
  );
}
