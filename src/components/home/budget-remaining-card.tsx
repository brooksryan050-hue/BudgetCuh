import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BudgetRemainingCard({ value }: { value: string }) {
  const theme = useTheme();

  return (
    <Card style={[styles.card, { backgroundColor: theme.brand + '14' }]}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <ThemedText type="small" themeColor="textSecondary">
            Budget remaining
          </ThemedText>
          <ThemedText numberOfLines={1} adjustsFontSizeToFit style={[styles.value, { color: theme.text }]}>
            {value}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            Available to spend this month
          </ThemedText>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: theme.brand + '26' }]}>
          <Ionicons name="wallet" size={26} color={theme.brand} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  textCol: {
    flex: 1,
    gap: Spacing.half,
  },
  value: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
