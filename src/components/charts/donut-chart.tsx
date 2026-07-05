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

export function DonutChart({ data, size = 172, strokeWidth = 16, centerLabel, centerValue }: DonutChartProps) {
  const theme = useTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Flat (butt) caps with no gap — segments' straight-cut edges sit flush against
  // each other. Round caps bleed strokeWidth/2 past their mathematical endpoint,
  // which made neighboring segments visually overlap instead of leaving a clean seam.
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
                strokeLinecap="butt"
                fill="none"
              />
            ))
          )}
        </Svg>
        {centerValue ? (
          <View style={styles.centerLabel}>
            <ThemedText type="title" style={styles.centerValue}>
              {centerValue}
            </ThemedText>
            {centerLabel ? (
              <ThemedText type="small" themeColor="textSecondary">
                {centerLabel}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.legend}>
        {data.map((datum) => {
          const pct = total > 0 ? Math.round((datum.value / total) * 100) : 0;
          return (
            <View key={datum.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: datum.color }]} />
              <ThemedText type="small" numberOfLines={1} style={styles.legendLabel}>
                {datum.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {pct}%
              </ThemedText>
            </View>
          );
        })}
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
  centerValue: {
    fontSize: 22,
    lineHeight: 26,
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
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    flex: 1,
  },
});
