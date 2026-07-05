import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type AvatarProps = {
  name: string;
  imageUri?: string;
  size?: number;
  onPress?: () => void;
};

export function Avatar({ name, imageUri, size = 40, onPress }: AvatarProps) {
  const theme = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  const content = imageUri ? (
    <Image
      source={{ uri: imageUri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
    />
  ) : (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.brandSecondary },
      ]}>
      <ThemedText style={{ color: '#ffffff', fontSize: size * 0.42, fontWeight: '700', lineHeight: size * 0.5 }}>
        {initial}
      </ThemedText>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
