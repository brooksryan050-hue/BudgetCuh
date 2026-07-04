import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';
import { useBudgetStore } from '@/store/budget-store';

export default function AuthLayout() {
  const session = useAuthStore((s) => s.session);
  const passwordRecovery = useAuthStore((s) => s.passwordRecovery);
  const hasCompletedOnboarding = useBudgetStore((s) => s.hasCompletedOnboarding);

  // A password-recovery deep link sets a real session, but the user hasn't actually
  // set a new password yet — let them land on /reset-password instead of bouncing
  // straight into the app on the strength of the temporary recovery session.
  if (session && !passwordRecovery) {
    return <Redirect href={hasCompletedOnboarding ? '/(tabs)' : '/onboarding'} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
