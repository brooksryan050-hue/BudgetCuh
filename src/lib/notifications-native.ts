import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const DAILY_REMINDER_ID = 'daily-spending-reminder';

/**
 * Schedules (or cancels) a local daily reminder at the given hour (0-23, local time).
 * Local scheduling only — no server/push token involved, and it works in Expo Go
 * unlike remote push. No-ops on web, which has no scheduling support in expo-notifications.
 */
export async function ensureDailyReminderScheduled(enabled: boolean, hour: number = 18): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

    if (!enabled) return;

    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') {
      const response = await Notifications.requestPermissionsAsync();
      finalStatus = response.status;
    }
    if (finalStatus !== 'granted') return;

    const clampedHour = Math.min(23, Math.max(0, Math.round(hour)));

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: 'Daily check-in',
        body: "Have you logged today's spending? Takes 10 seconds.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: clampedHour,
        minute: 0,
      },
    });
  } catch {
    // Notifications are a nice-to-have; never let scheduling failures break the app.
  }
}

export function formatReminderHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const period = normalized >= 12 ? 'PM' : 'AM';
  const twelveHour = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${twelveHour}:00 ${period}`;
}
