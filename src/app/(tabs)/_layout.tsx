import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { useSyncBootstrap } from '@/hooks/use-sync-bootstrap';
import { ensureDailyReminderScheduled } from '@/lib/notifications-native';
import {
  addNudgeNotificationTapListener,
  configurePushNotificationHandler,
  registerForPushNotificationsAsync,
} from '@/lib/push-notifications';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';
import { useBudgetStore } from '@/store/budget-store';

export default function TabsLayout() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const hasCompletedOnboarding = useBudgetStore((s) => s.hasCompletedOnboarding);
  const dailyReminderEnabled = useBudgetStore((s) => s.profile?.dailyReminderEnabled ?? false);
  const dailyReminderHour = useBudgetStore((s) => s.profile?.dailyReminderHour ?? 18);
  const pushNotificationsEnabled = useBudgetStore((s) => s.profile?.pushNotificationsEnabled ?? false);
  const expoPushToken = useBudgetStore((s) => s.profile?.expoPushToken);
  const updateProfile = useBudgetStore((s) => s.updateProfile);

  useEffect(() => {
    if (!hasCompletedOnboarding) return;
    ensureDailyReminderScheduled(dailyReminderEnabled, dailyReminderHour);
  }, [hasCompletedOnboarding, dailyReminderEnabled, dailyReminderHour]);

  useEffect(() => {
    if (!hasCompletedOnboarding) return;
    configurePushNotificationHandler();
    const unsubscribe = addNudgeNotificationTapListener();
    return unsubscribe;
  }, [hasCompletedOnboarding]);

  useEffect(() => {
    if (!hasCompletedOnboarding || !pushNotificationsEnabled) return;
    registerForPushNotificationsAsync().then((token) => {
      if (token && token !== expoPushToken) {
        updateProfile({ expoPushToken: token });
      }
    });
  }, [hasCompletedOnboarding, pushNotificationsEnabled, expoPushToken, updateProfile]);

  useSyncBootstrap();

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Trends',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
