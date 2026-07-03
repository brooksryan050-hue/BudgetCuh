import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NotificationCard as NotificationCardType } from '@/types';

const ICON_BY_TYPE: Record<NotificationCardType['type'], keyof typeof Ionicons.glyphMap> = {
  daily_checkin: 'today',
  weekly_review: 'calendar',
  challenge_reminder: 'flame',
  overspending_warning: 'warning',
  goal_progress: 'flag',
  end_of_week_summary: 'stats-chart',
};

export function NotificationCard({
  card,
  onPress,
  onDismiss,
}: {
  card: NotificationCardType;
  onPress?: () => void;
  onDismiss?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
        <Ionicons name={ICON_BY_TYPE[card.type]} size={16} color={theme.brand} />
      </View>
      <View style={styles.textColumn}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {card.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {card.message}
        </ThemedText>
      </View>
      {onDismiss ? (
        <Pressable hitSlop={8} onPress={onDismiss}>
          <Ionicons name="close" size={16} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
