import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LinePoint = { label: string; value: number };

type LineChartProps = {
  points: LinePoint[];
  color?: string;
  height?: number;
};

export function LineChart({ points, color, height = 120 }: LineChartProps) {
  const theme = useTheme();
  const lineColor = color ?? theme.brand;

  if (points.length === 0) {
    return null;
  }

  const maxValue = Math.max(1, ...points.map((p) => p.value));
  const minValue = Math.min(0, ...points.map((p) => p.value));
  const valueRange = maxValue - minValue || 1;
  const stepX = points.length > 1 ? 100 / (points.length - 1) : 0;

  const coords = points.map((point, index) => {
    const x = index * stepX;
    const y = height - ((point.value - minValue) / valueRange) * (height - 8) - 4;
    return { x, y };
  });

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        <Path d={path} stroke={lineColor} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={2} fill={lineColor} />
        ))}
      </Svg>
      <View style={styles.labelRow}>
        {points.map((point, index) => (
          <ThemedText key={`${point.label}-${index}`} type="small" themeColor="textSecondary" style={styles.label}>
            {point.label}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    marginTop: Spacing.one,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
  },
});
