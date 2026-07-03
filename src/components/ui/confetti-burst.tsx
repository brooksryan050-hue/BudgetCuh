import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const COLORS = ['#1FAA59', '#3C87F7', '#F5A623', '#E5484D', '#7C5CFC', '#D6409F'];

type ParticleProps = {
  color: string;
  angle: number;
  distance: number;
  delay: number;
  trigger: number;
};

function Particle({ color, angle, distance, delay, trigger }: ParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * distance * progress.value;
    const dy = Math.sin(angle) * distance * progress.value + progress.value * progress.value * 40;
    return {
      opacity: 1 - progress.value,
      transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${progress.value * 360}deg` }],
    };
  });

  return <Animated.View style={[styles.particle, { backgroundColor: color }, animatedStyle]} />;
}

export function ConfettiBurst({ trigger, particleCount = 24 }: { trigger: number; particleCount?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => ({
        color: COLORS[i % COLORS.length],
        angle: (Math.PI * 2 * i) / particleCount + Math.random() * 0.3,
        distance: 60 + Math.random() * 80,
        delay: Math.random() * 120,
      })),
    [particleCount]
  );

  if (trigger === 0) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      {particles.map((particle, index) => (
        <Particle key={index} {...particle} trigger={trigger} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
