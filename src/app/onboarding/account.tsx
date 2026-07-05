import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { ThemedText } from '@/components/themed-text';
import { getCurrencyByCode } from '@/data/currencies';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOnboardingDraft } from './_layout';

export default function AccountScreen() {
  const theme = useTheme();
  const { draft, updateDraft } = useOnboardingDraft();
  const currencySymbol = getCurrencyByCode(draft.currency)?.symbol ?? draft.currency;

  const canContinue = draft.accountName.trim().length > 0;

  return (
    <OnboardingScaffold
      step={2}
      totalSteps={5}
      title="Set up an account"
      subtitle="This tracks your balance on Home. You can add more accounts anytime."
      onContinue={() => router.push('/onboarding/categories')}
      continueDisabled={!canContinue}>
      <View style={styles.field}>
        <ThemedText type="smallBold">Account name</ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Main Account"
          placeholderTextColor={theme.textSecondary}
          value={draft.accountName}
          onChangeText={(accountName) => updateDraft({ accountName })}
          returnKeyType="next"
        />
        {draft.accountName.trim().length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Name your account to continue
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Current balance</ThemedText>
        <View style={[styles.amountInput, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="default" themeColor="textSecondary">
            {currencySymbol}
          </ThemedText>
          <TextInput
            style={[styles.amountField, { color: theme.text }]}
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            value={draft.startingBalance}
            onChangeText={(startingBalance) => updateDraft({ startingBalance })}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Have more than one account? Add the rest from Home once you&apos;re set up.
        </ThemedText>
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  amountField: {
    flex: 1,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
});
