import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';

/**
 * Shared guard for screens that show real user data but live outside the (tabs)
 * navigator (transactions, savings-goals, transaction-form, challenge/[id], coach,
 * reflection). Without this, these were reachable via a direct deep link (e.g.
 * app:///transactions) while signed out, since (tabs)/_layout.tsx's own session
 * check only runs for routes inside that group — see CLAUDE.md/security audit notes.
 * Group segments like `(protected)` are invisible in the URL, so every existing
 * `router.push('/transactions')`-style call site keeps working unchanged.
 * (Deep link example above uses the `app` scheme historically; the configured
 * scheme is now `budgetcuh` — see app.json.)
 */
export default function ProtectedLayout() {
  const session = useAuthStore((s) => s.session);

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="transaction-form" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
