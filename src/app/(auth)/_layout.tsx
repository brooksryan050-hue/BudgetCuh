import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';

export default function AuthLayout() {
  const session = useAuthStore((s) => s.session);
  const passwordRecovery = useAuthStore((s) => s.passwordRecovery);

  // A password-recovery deep link sets a real session, but the user hasn't actually
  // set a new password yet — let them land on /reset-password instead of bouncing
  // straight into the app on the strength of the temporary recovery session.
  //
  // Always land on /(tabs), never decide onboarding-vs-not here: right after a fresh
  // sign-in or password reset, the local hasCompletedOnboarding flag can still be
  // stale/false for an account that already onboarded elsewhere (its real value only
  // arrives once the cold-start sync pass pulls the remote profile). (tabs)/_layout.tsx
  // is the single place that waits for that pass before deciding whether onboarding is
  // actually needed — duplicating the decision here raced ahead of it and sent
  // returning accounts to onboarding by mistake.
  if (session && !passwordRecovery) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
