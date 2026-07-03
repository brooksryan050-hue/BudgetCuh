import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PillProps = {
  label: string;
  selected?: boolean;
  color?: string;
  onPress?: () => void;
};

export function Pill({ label, selected, color, onPress }: PillProps) {
  const theme = useTheme();
  const backgroundColor = selected ? (color ?? theme.brand) : theme.backgroundElement;
  const textColor = selected ? '#ffffff' : theme.text;

  const content = (
    <ThemedText type="smallBold" style={{ color: textColor }}>
      {label}
    </ThemedText>
  );

  if (!onPress) {
    return <View style={[styles.pill, { backgroundColor }]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, { backgroundColor }, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginRight: Spacing.two,
    marginBottom: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
});
