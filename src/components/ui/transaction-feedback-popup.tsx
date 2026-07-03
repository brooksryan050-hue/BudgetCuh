import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';

const INCOME_SYMBOLS = ['💵', '💰', '✨', '💸', '✨'];
const EXPENSE_SYMBOLS = ['💸', '😔', '💧', '💨'];

type ParticleProps = {
  symbol: string;
  angle: number;
  distance: number;
  delay: number;
  trigger: number;
  fall?: boolean;
};

function Particle({ symbol, angle, distance, delay, trigger, fall }: ParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * distance * progress.value;
    const dy = Math.sin(angle) * distance * progress.value + (fall ? progress.value * 20 : -progress.value * 30);
    return {
      opacity: 1 - progress.value,
      transform: [{ translateX: dx }, { translateY: dy }, { scale: 0.6 + progress.value * 0.6 }],
    };
  });

  return (
    <Animated.View style={[styles.particle, animatedStyle]}>
      <ThemedText style={styles.particleEmoji}>{symbol}</ThemedText>
    </Animated.View>
  );
}

type TransactionFeedbackPopupProps = {
  trigger: number;
  variant?: 'income' | 'expense';
};

export function TransactionFeedbackPopup({ trigger, variant = 'income' }: TransactionFeedbackPopupProps) {
  const isExpense = variant === 'expense';
  const motion = useSharedValue(0);

  useEffect(() => {
    motion.value = 0;
    if (isExpense) {
      motion.value = withSequence(
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0.85, { duration: 220 }),
        withDelay(250, withTiming(0, { duration: 300 }))
      );
    } else {
      motion.value = withSequence(
        withTiming(1, { duration: 220, easing: Easing.out(Easing.back(2)) }),
        withTiming(0.9, { duration: 160 }),
        withTiming(1, { duration: 160 }),
        withDelay(200, withTiming(0, { duration: 250 }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, isExpense]);

  const characterStyle = useAnimatedStyle(() => {
    if (isExpense) {
      return {
        opacity: motion.value,
        transform: [
          { scale: 0.8 + motion.value * 0.35 },
          { translateY: motion.value * 10 },
          { rotate: `${(1 - motion.value) * -8}deg` },
        ],
      };
    }
    return {
      opacity: motion.value,
      transform: [{ scale: 0.7 + motion.value * 0.5 }],
    };
  });

  const particles = useMemo(
    () =>
      Array.from({ length: isExpense ? 6 : 8 }, (_, i) => ({
        symbol: isExpense ? EXPENSE_SYMBOLS[i % EXPENSE_SYMBOLS.length] : INCOME_SYMBOLS[i % INCOME_SYMBOLS.length],
        angle: (isExpense ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 1.8,
        distance: 50 + Math.random() * 60,
        delay: Math.random() * 150,
        fall: isExpense,
      })),
    [isExpense]
  );

  if (trigger === 0) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      {particles.map((particle, index) => (
        <Particle key={index} {...particle} trigger={trigger} />
      ))}
      <Animated.View style={characterStyle}>
        <ThemedText style={styles.character}>{isExpense ? '😢' : '🐷'}</ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  character: {
    fontSize: 64,
    lineHeight: 76,
  },
  particle: {
    position: 'absolute',
  },
  particleEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
});
