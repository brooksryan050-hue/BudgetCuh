import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DonutDatum = { label: string; value: number; color: string };

type DonutChartProps = {
  data: DonutDatum[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
};

export function DonutChart({ data, size = 160, strokeWidth = 20, centerLabel, centerValue }: DonutChartProps) {
  const theme = useTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segments = data.map((datum) => {
    const fraction = total > 0 ? datum.value / total : 0;
    const segmentLength = circumference * fraction;
    const segment = {
      ...datum,
      dashArray: `${segmentLength} ${circumference - segmentLength}`,
      dashOffset: -cumulativeOffset,
    };
    cumulativeOffset += segmentLength;
    return segment;
  });

  return (
    <View style={styles.row}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          {total === 0 ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.backgroundSelected}
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : (
            segments.map((segment) => (
              <Circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={segment.dashArray}
                strokeDashoffset={segment.dashOffset}
                fill="none"
              />
            ))
          )}
        </Svg>
        {centerValue ? (
          <View style={styles.centerLabel}>
            <ThemedText type="smallBold">{centerValue}</ThemedText>
            {centerLabel ? (
              <ThemedText type="small" themeColor="textSecondary">
                {centerLabel}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.legend}>
        {data.map((datum) => (
          <View key={datum.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: datum.color }]} />
            <ThemedText type="small" numberOfLines={1} style={styles.legendLabel}>
              {datum.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  centerLabel: {
    alignItems: 'center',
  },
  legend: {
    flex: 1,
    gap: Spacing.one,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    flex: 1,
  },
});
