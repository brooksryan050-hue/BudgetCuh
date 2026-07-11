import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type OnboardingProgressDotsProps = {
  step: number;
  totalSteps: number;
  /** Override for use over a colored/gradient background instead of the themed app background. */
  activeColor?: string;
  inactiveColor?: string;
};

export function OnboardingProgressDots({ step, totalSteps, activeColor, inactiveColor }: OnboardingProgressDotsProps) {
  const theme = useTheme();
  const active = activeColor ?? theme.brand;
  const inactive = inactiveColor ?? theme.backgroundSelected;

  return (
    <View style={styles.dots}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i <= step ? active : inactive }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 24,
    height: 6,
    borderRadius: Radius.full,
  },
});
