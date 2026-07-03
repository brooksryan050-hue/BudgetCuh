import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
};

export function ProgressBar({ progress, color, trackColor, height = 8 }: ProgressBarProps) {
  const theme = useTheme();
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: trackColor ?? theme.backgroundSelected, borderRadius: height / 2 },
      ]}>
      <View
        style={[
          styles.fill,
          {
            width: `${pct}%`,
            height,
            backgroundColor: color ?? theme.brand,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: Radius.full,
  },
  fill: {
    borderRadius: Radius.full,
  },
});
