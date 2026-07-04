import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dismissSimulatedNotification, useSimulatedNotification } from '@/lib/notification-toast';

const AUTO_DISMISS_MS = 6000;

/**
 * Mounted once at the root layout, so it can appear over any screen — mirroring
 * where a real OS push banner would show up. Only needed because real push has no
 * web equivalent to test against (see notification-toast.ts); on a physical device
 * with push actually configured, this is unused.
 */
export function NotificationToastHost() {
  const theme = useTheme();
  const notification = useSimulatedNotification();
  const translateY = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    if (!notification) return;

    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, mass: 0.9 }).start();

    const timer = setTimeout(() => dismissSimulatedNotification(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notification, translateY]);

  if (!notification) return null;

  function handlePress() {
    notification?.onPress?.();
    dismissSimulatedNotification();
  }

  return (
    <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
      <Animated.View style={[styles.wrap, { transform: [{ translateY }] }]}>
        <Pressable
          onPress={handlePress}
          style={[styles.banner, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.eyebrow}>
            BudgetCuh · simulated push (web/testing only)
          </ThemedText>
          <ThemedText type="smallBold" numberOfLines={1}>
            {notification.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {notification.message}
          </ThemedText>
          <Pressable
            hitSlop={8}
            style={styles.closeButton}
            onPress={(e) => {
              e.stopPropagation();
              dismissSimulatedNotification();
            }}>
            <Ionicons name="close" size={16} color={theme.textSecondary} />
          </Pressable>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  wrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
  },
  banner: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: 2,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.18)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  eyebrow: {
    fontSize: 11,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
  },
});
