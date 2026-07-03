import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MetricListItem = {
  key: string;
  label: string;
  value: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
  colorize?: boolean;
};

export function MetricList({ items }: { items: MetricListItem[] }) {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      {items.map((item, index) => {
        const color = !item.colorize
          ? theme.text
          : item.deltaDirection === 'up'
            ? theme.success
            : item.deltaDirection === 'down'
              ? theme.danger
              : theme.text;

        return (
          <View key={item.key}>
            {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
            <View style={styles.row}>
              <ThemedText type="default" numberOfLines={1} style={styles.label}>
                {item.label}
              </ThemedText>
              <ThemedText type="smallBold" numberOfLines={1} style={{ color }}>
                {item.value}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  label: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
