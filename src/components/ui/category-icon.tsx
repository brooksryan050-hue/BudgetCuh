import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getCategoryById } from '@/data/categories';
import { Radius } from '@/constants/theme';

type CategoryIconProps = {
  categoryId: string;
  size?: number;
};

export function CategoryIcon({ categoryId, size = 36 }: CategoryIconProps) {
  const category = getCategoryById(categoryId);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: `${category.color}26` },
      ]}>
      <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={size * 0.5} color={category.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
});
