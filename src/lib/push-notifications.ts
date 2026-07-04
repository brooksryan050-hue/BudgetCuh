import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

/**
 * Remote push registration + handling for AI coaching nudges. Parallels
 * notifications-native.ts's local daily reminder (same web guard, same
 * never-let-it-break-the-app try/catch philosophy) but this one mints a real Expo
 * push token, which requires an EAS project id (expo.extra.eas.projectId in
 * app.json) — absent until `npx eas init` has been run once. Until then,
 * registerForPushNotificationsAsync() cleanly returns null.
 */

export function configurePushNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') {
      const response = await Notifications.requestPermissionsAsync();
      finalStatus = response.status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

/** Navigates to the Coach screen when a nudge push is tapped. Returns an unsubscribe fn. */
export function addNudgeNotificationTapListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.notification.request.content.data?.type === 'nudge') {
      router.push('/coach');
    }
  });
  return () => subscription.remove();
}
