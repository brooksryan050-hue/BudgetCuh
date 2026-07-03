import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedView } from '@/components/themed-view';
import { useBudgetStore } from '@/store/budget-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hasHydrated = useBudgetStore((s) => s.hasHydrated);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {hasHydrated ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="transactions" />
          <Stack.Screen name="challenge/[id]" />
          <Stack.Screen name="savings-goals" />
          <Stack.Screen name="transaction-form" options={{ presentation: 'modal' }} />
        </Stack>
      ) : (
        <ThemedView style={{ flex: 1 }} />
      )}
    </ThemeProvider>
  );
}
