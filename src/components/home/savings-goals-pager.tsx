import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { SavingsGoalCard } from '@/components/goals/savings-goal-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SavingsGoal } from '@/types';

type SavingsGoalsPagerProps = {
  goals: SavingsGoal[];
  currency: string;
};

export function SavingsGoalsPager({ goals, currency }: SavingsGoalsPagerProps) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);

  const pageCount = goals.length + 1;

  return (
    <View style={styles.measureWrap} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      {containerWidth > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width: containerWidth }}
          scrollEventThrottle={16}
          onScroll={(e) => setPageIndex(Math.round(e.nativeEvent.contentOffset.x / containerWidth))}>
          {goals.map((goal) => (
            <View key={goal.id} style={{ width: containerWidth }}>
              <SavingsGoalCard
                goal={goal}
                currency={currency}
                onPress={() => router.push('/savings-goals')}
                onEdit={() => router.push('/savings-goals')}
              />
            </View>
          ))}

          <View style={{ width: containerWidth }}>
            <Pressable onPress={() => router.push('/savings-goals')}>
              <Card style={styles.addCard}>
                <Ionicons name="add-circle-outline" size={28} color={theme.brand} />
                <ThemedText type="smallBold" style={{ color: theme.brand }}>
                  Add goal
                </ThemedText>
              </Card>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}

      {pageCount > 1 ? (
        <View style={styles.dots}>
          {Array.from({ length: pageCount }, (_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === pageIndex ? theme.brand : theme.backgroundSelected },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  measureWrap: {
    width: '100%',
  },
  addCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.five,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
