import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { IconActionButton } from '@/components/ui/icon-action-button';
import { useTheme } from '@/hooks/use-theme';

const QUICK_ACTION_BG = 'rgba(255,255,255,0.08)';

export function HomeQuickActions() {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <IconActionButton
        icon="arrow-up-circle"
        label="Expense"
        onPress={() => router.push({ pathname: '/transaction-form', params: { type: 'expense' } })}
        backgroundColor={QUICK_ACTION_BG}
        tintColor={theme.text}
      />
      <IconActionButton
        icon="arrow-down-circle"
        label="Income"
        onPress={() => router.push({ pathname: '/transaction-form', params: { type: 'income' } })}
        backgroundColor={QUICK_ACTION_BG}
        tintColor={theme.text}
      />
      <IconActionButton
        icon="information-circle-outline"
        label="Info"
        onPress={() => router.push('/coach')}
        backgroundColor={QUICK_ACTION_BG}
        tintColor={theme.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
