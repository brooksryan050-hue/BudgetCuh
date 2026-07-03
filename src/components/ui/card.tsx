import { Pressable, StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

export type CardProps = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
};

export function Card({ style, onPress, padded = true, ...rest }: CardProps) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        <ThemedView type="backgroundElement" style={[styles.card, padded && styles.padded, style]} {...rest} />
      </Pressable>
    );
  }

  return <ThemedView type="backgroundElement" style={[styles.card, padded && styles.padded, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
  },
  padded: {
    padding: Spacing.four,
  },
  pressed: {
    opacity: 0.75,
  },
});
