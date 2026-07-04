import { Fragment, useState } from 'react';
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
  /** Formats a bar's raw value for the tap-to-reveal readout, e.g. currency. Defaults to the raw number. */
  formatValue?: (value: number) => string;
};

export function BarChart({ data, color, height = 140, highlightIndex, highlightColor, formatValue }: BarChartProps) {
  const theme = useTheme();
  const barColor = color ?? theme.brand;
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  function toggleSelected(index: number) {
    setSelectedIndex((current) => (current === index ? null : index));
  }

  const selected = selectedIndex !== null ? data[selectedIndex] : null;

  return (
    <View>
      <View style={styles.readout}>
        {selected ? (
          <ThemedText type="smallBold">
            {selected.label}: {formatValue ? formatValue(selected.value) : selected.value}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Tap a bar to see its value
          </ThemedText>
        )}
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((datum, index) => {
          const barHeight = (datum.value / maxValue) * (height - 4);
          const columnX = index * barWidth;
          const x = columnX + barWidth * 0.2;
          const width = barWidth * 0.6;
          const isHighlighted = highlightIndex === index || selectedIndex === index;
          return (
            <Fragment key={`${datum.label}-${index}`}>
              {/* Full-column, invisible tap target — the visible bar itself is often too
                  narrow to reliably tap, especially with 6-7 bars sharing the width. */}
              <Rect
                x={columnX}
                y={0}
                width={barWidth}
                height={height}
                fill="transparent"
                onPress={() => toggleSelected(index)}
              />
              <Rect
                x={x}
                y={height - barHeight}
                width={width}
                height={Math.max(2, barHeight)}
                rx={2}
                fill={isHighlighted ? (highlightColor ?? theme.brandSecondary) : barColor}
                onPress={() => toggleSelected(index)}
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

export type GroupedBarDatum = { label: string; a: number; b: number };

type GroupedBarChartProps = {
  data: GroupedBarDatum[];
  colorA?: string;
  colorB?: string;
  height?: number;
  labelA?: string;
  labelB?: string;
  formatValue?: (value: number) => string;
};

export function GroupedBarChart({
  data,
  colorA,
  colorB,
  height = 140,
  labelA = 'A',
  labelB = 'B',
  formatValue,
}: GroupedBarChartProps) {
  const theme = useTheme();
  const barA = colorA ?? theme.success;
  const barB = colorB ?? theme.danger;
  const maxValue = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
  const groupWidth = 100 / data.length;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  function toggleSelected(index: number) {
    setSelectedIndex((current) => (current === index ? null : index));
  }

  const selected = selectedIndex !== null ? data[selectedIndex] : null;
  // a - b as a % of a (income saved) — guarded against a === 0 so it never divides by zero.
  const pctSaved = selected ? (selected.a > 0 ? ((selected.a - selected.b) / selected.a) * 100 : selected.b > 0 ? -100 : 0) : null;
  const format = formatValue ?? ((value: number) => `${value}`);

  return (
    <View>
      <View style={styles.readout}>
        {selected ? (
          <ThemedText type="smallBold">
            {selected.label}: {labelA} {format(selected.a)} · {labelB} {format(selected.b)} ·{' '}
            {pctSaved !== null ? `${Math.round(pctSaved)}% saved` : ''}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Tap a group to see its values
          </ThemedText>
        )}
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((datum, index) => {
          const heightA = (datum.a / maxValue) * (height - 4);
          const heightB = (datum.b / maxValue) * (height - 4);
          const groupX = index * groupWidth;
          const barWidth = groupWidth * 0.32;
          return (
            <Fragment key={`${datum.label}-${index}`}>
              <Rect
                x={groupX}
                y={0}
                width={groupWidth}
                height={height}
                fill="transparent"
                onPress={() => toggleSelected(index)}
              />
              <Rect
                x={groupX + groupWidth * 0.14}
                y={height - heightA}
                width={barWidth}
                height={Math.max(2, heightA)}
                rx={2}
                fill={barA}
                onPress={() => toggleSelected(index)}
              />
              <Rect
                x={groupX + groupWidth * 0.54}
                y={height - heightB}
                width={barWidth}
                height={Math.max(2, heightB)}
                rx={2}
                fill={barB}
                onPress={() => toggleSelected(index)}
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
  readout: {
    minHeight: 20,
    marginBottom: Spacing.one,
  },
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
