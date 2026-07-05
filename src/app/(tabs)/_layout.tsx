import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { useSyncBootstrap } from '@/hooks/use-sync-bootstrap';
import { ensureDailyReminderScheduled } from '@/lib/notifications-native';
import {
  addNudgeNotificationTapListener,
  configurePushNotificationHandler,
  registerForPushNotificationsAsync,
} from '@/lib/push-notifications';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';
import { useBudgetStore } from '@/store/budget-store';

/**
 * Outline glyph when inactive, filled glyph when active (the standard iOS tab-bar
 * convention) plus a soft tinted pill behind the active icon — a plain same-glyph,
 * same-shape icon for both states is what read as "basic" before.
 */
function TabIcon({
  focused,
  color,
  size,
  activeIcon,
  inactiveIcon,
}: {
  focused: boolean;
  color: string;
  size: number;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: `${color}1F` }]}>
      <Ionicons name={focused ? activeIcon : inactiveIcon} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} color={color} size={size} activeIcon="home" inactiveIcon="home-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              activeIcon="pie-chart"
              inactiveIcon="pie-chart-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Trends',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              activeIcon="stats-chart"
              inactiveIcon="stats-chart-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused} color={color} size={size} activeIcon="flame" inactiveIcon="flame-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={size}
              activeIcon="person-circle"
              inactiveIcon="person-circle-outline"
            />
          ),
        }}
      />
    </Tabs>
  );
}
