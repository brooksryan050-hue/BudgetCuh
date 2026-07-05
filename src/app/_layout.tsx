import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedView } from '@/components/themed-view';
import { subscribeToAuthDeepLinks } from '@/lib/auth-deep-link';
import { configurePurchases, logInPurchasesUser, logOutPurchasesUser } from '@/lib/purchases';
import { useAuthStore } from '@/store/auth-store';
import { useBudgetStore } from '@/store/budget-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hasHydrated = useBudgetStore((s) => s.hasHydrated);
  const authInitializing = useAuthStore((s) => s.authInitializing);
  const session = useAuthStore((s) => s.session);
  const loggedInPurchasesUserId = useRef<string | null>(null);

  useEffect(() => subscribeToAuthDeepLinks(), []);

  useEffect(() => {
    configurePurchases();
  }, []);

  // Ties RevenueCat's subscriber record to the Supabase user id (rather than an
  // anonymous device id) so a subscription follows the account across
  // devices/reinstalls. Guarded by a ref, not just `session`, because
  // onAuthStateChange also fires on token refresh with a new session object for the
  // same user — without the ref this would call logIn/logOut on every refresh.
  useEffect(() => {
    if (authInitializing) return;
    const userId = session?.user.id ?? null;
    if (userId === loggedInPurchasesUserId.current) return;
    loggedInPurchasesUserId.current = userId;
    if (userId) {
      logInPurchasesUser(userId).catch(() => {});
    } else {
      logOutPurchasesUser().catch(() => {});
    }
  }, [session, authInitializing]);

  return (
    <ThemeProvider value={DarkTheme}>
      <AnimatedSplashOverlay />
      {hasHydrated && !authInitializing ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(protected)" />
        </Stack>
      ) : (
        <ThemedView style={{ flex: 1 }} />
      )}
    </ThemeProvider>
  );
}
