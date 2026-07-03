import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BarDatum = { label: string; value: number };

type BarChartProps = {
  data: BarDatum[];
  color?: string;
  height?: number;
  highlightIndex?: number;
  highlightColor?: string;
};

export function BarChart({ data, color, height = 140, highlightIndex, highlightColor }: BarChartProps) {
  const theme = useTheme();
  const barColor = color ?? theme.brand;
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((datum, index) => {
          const barHeight = (datum.value / maxValue) * (height - 4);
          const x = index * barWidth + barWidth * 0.2;
          const width = barWidth * 0.6;
          const isHighlighted = highlightIndex === index;
          return (
            <Rect
              key={`${datum.label}-${index}`}
              x={x}
              y={height - barHeight}
              width={width}
              height={Math.max(2, barHeight)}
              rx={2}
              fill={isHighlighted ? (highlightColor ?? theme.brandSecondary) : barColor}
            />
          );
        })}
      </Svg>
      <View style={styles.labelRow}>
        {data.map((datum, index) => (
          <View key={`${datum.label}-${index}`} style={styles.labelCell}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.label}>
              {datum.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

export type GroupedBarDatum = { label: string; a: number; b: number };

type GroupedBarChartProps = {
  data: GroupedBarDatum[];
  colorA?: string;
  colorB?: string;
  height?: number;
};

export function GroupedBarChart({ data, colorA, colorB, height = 140 }: GroupedBarChartProps) {
  const theme = useTheme();
  const barA = colorA ?? theme.success;
  const barB = colorB ?? theme.danger;
  const maxValue = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
  const groupWidth = 100 / data.length;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((datum, index) => {
          const heightA = (datum.a / maxValue) * (height - 4);
          const heightB = (datum.b / maxValue) * (height - 4);
          const groupX = index * groupWidth;
          const barWidth = groupWidth * 0.32;
          return (
            <Fragment key={`${datum.label}-${index}`}>
              <Rect
                x={groupX + groupWidth * 0.14}
                y={height - heightA}
                width={barWidth}
                height={Math.max(2, heightA)}
                rx={2}
                fill={barA}
              />
              <Rect
                x={groupX + groupWidth * 0.54}
                y={height - heightB}
                width={barWidth}
                height={Math.max(2, heightB)}
                rx={2}
                fill={barB}
              />
            </Fragment>
          );
        })}
      </Svg>
      <View style={styles.labelRow}>
        {data.map((datum, index) => (
          <View key={`${datum.label}-${index}`} style={styles.labelCell}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.label}>
              {datum.label}
            </ThemedText>
          </View>
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
  labelCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  label: {
    textAlign: 'center',
    fontSize: 10,
  },
});
