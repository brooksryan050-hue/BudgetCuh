import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useLatestNudge } from '@/hooks/use-ai-nudges';
import { useReflections } from '@/hooks/use-ai-reflections';
import { useTheme } from '@/hooks/use-theme';

function FeatureRow({
  icon,
  tintColor,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tintColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: tintColor + '26' }]}>
          <Ionicons name={icon} size={22} color={tintColor} />
        </View>
        <View style={styles.textCol}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </View>
    </Card>
  );
}

export function AiFeaturesSection() {
  const theme = useTheme();
  const { nudge } = useLatestNudge();
  const { reflections } = useReflections('weekly');
  const latestReflection = reflections[0];

  return (
    <View style={styles.section}>
      <FeatureRow
        icon="chatbubble-ellipses"
        tintColor={theme.brand}
        title="Coach"
        subtitle={nudge ? nudge.title : 'Get today’s coaching tip'}
        onPress={() => router.push('/coach')}
      />
      <FeatureRow
        icon="book"
        tintColor={theme.brandSecondary}
        title="Reflections"
        subtitle={latestReflection ? 'Your weekly recap is ready' : 'Weekly and monthly recaps'}
        onPress={() => router.push('/reflection')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  card: {
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
});
