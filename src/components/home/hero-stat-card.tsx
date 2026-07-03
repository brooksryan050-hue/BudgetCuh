import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';

type HeroStatCardProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tintColor: string;
  tintBackground: string;
  style?: StyleProp<ViewStyle>;
};

export function HeroStatCard({ label, value, icon, tintColor, tintBackground, style }: HeroStatCardProps) {
  return (
    <Card style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: tintBackground }]}>
        <Ionicons name={icon} size={18} color={tintColor} />
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.label}>
        {label}
      </ThemedText>
      <ThemedText numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
        {value}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: Spacing.one,
  },
  value: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
});
