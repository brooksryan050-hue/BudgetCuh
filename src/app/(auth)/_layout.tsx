import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';
import { useBudgetStore } from '@/store/budget-store';

export default function AuthLayout() {
  const session = useAuthStore((s) => s.session);
  const hasCompletedOnboarding = useBudgetStore((s) => s.hasCompletedOnboarding);

  if (session) {
    return <Redirect href={hasCompletedOnboarding ? '/(tabs)' : '/onboarding'} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
