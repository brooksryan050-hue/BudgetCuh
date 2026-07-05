import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type IconActionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label?: string;
  size?: number;
  backgroundColor: string;
  tintColor: string;
  labelColor?: string;
};

/**
 * One circular icon button, two visual jobs: the hero's frosted header icons
 * (no label) and the quick-actions row's solid dark circles (with a label
 * underneath) — callers pick colors/label, this just handles the shape + press state.
 */
export function IconActionButton({
  icon,
  onPress,
  label,
  size = 44,
  backgroundColor,
  tintColor,
  labelColor,
}: IconActionButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.wrap} hitSlop={4}>
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.circle,
              { width: size, height: size, borderRadius: size / 2, backgroundColor },
              pressed && styles.pressed,
            ]}>
            <Ionicons name={icon} size={size * 0.45} color={tintColor} />
          </View>
          {label ? (
            <ThemedText type="small" style={[styles.label, labelColor ? { color: labelColor } : null]}>
              {label}
            </ThemedText>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 12,
  },
});
