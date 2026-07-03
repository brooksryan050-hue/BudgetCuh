import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SavingsGoalEmptyCard() {
  const theme = useTheme();

  return (
    <Pressable onPress={() => router.push('/savings-goals')}>
      <Card style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: theme.brand + '1F' }]}>
          <Ionicons name="flag" size={20} color={theme.brand} />
        </View>
        <View style={styles.textCol}>
          <ThemedText type="smallBold">Start a savings goal</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            Set a target and track your progress
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
});
