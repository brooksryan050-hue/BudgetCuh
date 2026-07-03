import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Badge } from '@/types';

export function BadgeCard({ badge, style }: { badge: Badge; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const earned = badge.earnedAt !== null;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: earned ? theme.successBackground : theme.backgroundElement },
        ]}>
        <Ionicons
          name={badge.icon as keyof typeof Ionicons.glyphMap}
          size={26}
          color={earned ? theme.success : theme.textSecondary}
        />
      </View>
      <ThemedText type="small" style={styles.name} numberOfLines={2}>
        {badge.name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 84,
    alignItems: 'center',
    gap: Spacing.one,
    marginRight: Spacing.three,
    marginBottom: Spacing.three,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    textAlign: 'center',
    fontSize: 11,
  },
});
