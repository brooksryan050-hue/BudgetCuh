import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getCategoryById } from '@/data/categories';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CategoryIconProps = {
  categoryId: string;
  size?: number;
};

/**
 * Monochrome by design — every category icon uses the brand color, not
 * `category.color` (that field only feeds Trends' donut/bar charts, which need
 * distinct hues per category to be readable; a decorative icon doesn't). The
 * background is a soft top-to-bottom brand-tint gradient rather than a flat wash,
 * for a bit more depth than a single flat color.
 */
export function CategoryIcon({ categoryId, size = 36 }: CategoryIconProps) {
  const theme = useTheme();
  const category = getCategoryById(categoryId);

  return (
    <LinearGradient
      colors={[`${theme.brand}3D`, `${theme.brand}14`]}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={size * 0.5} color={theme.brand} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
});
