import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedView } from '@/components/themed-view';
import { NotificationToastHost } from '@/components/ui/notification-toast-host';
import { subscribeToAuthDeepLinks } from '@/lib/auth-deep-link';
import { useAuthStore } from '@/store/auth-store';
import { useBudgetStore } from '@/store/budget-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hasHydrated = useBudgetStore((s) => s.hasHydrated);
  const authInitializing = useAuthStore((s) => s.authInitializing);

  useEffect(() => subscribeToAuthDeepLinks(), []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {hasHydrated && !authInitializing ? (
        <>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(protected)" />
          </Stack>
          <NotificationToastHost />
        </>
      ) : (
        <ThemedView style={{ flex: 1 }} />
      )}
    </ThemeProvider>
  );
}
