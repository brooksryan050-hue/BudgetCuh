import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { ThemedText } from '@/components/themed-text';
import { CurrencyPicker } from '@/components/ui/currency-picker';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOnboardingDraft } from './_layout';

export default function AboutYouScreen() {
  const theme = useTheme();
  const { draft, updateDraft } = useOnboardingDraft();

  const canContinue = draft.name.trim().length > 0 && parseFloat(draft.monthlyIncome) > 0;

  return (
    <OnboardingScaffold
      step={1}
      totalSteps={5}
      title="Tell us about you"
      subtitle="This helps us tailor budgets and challenges to your income."
      onContinue={() => router.push('/onboarding/account')}
      continueDisabled={!canContinue}>
      <View style={styles.field}>
        <ThemedText type="smallBold">Your name</ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Alex"
          placeholderTextColor={theme.textSecondary}
          value={draft.name}
          onChangeText={(name) => updateDraft({ name })}
          returnKeyType="next"
          autoFocus
        />
        {draft.name.trim().length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Enter your name to continue
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Currency</ThemedText>
        <CurrencyPicker inline value={draft.currency} onChange={(currency) => updateDraft({ currency })} />
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Monthly income</ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          value={draft.monthlyIncome}
          onChangeText={(monthlyIncome) => updateDraft({ monthlyIncome })}
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
        {draft.name.trim().length > 0 && !(parseFloat(draft.monthlyIncome) > 0) ? (
          <ThemedText type="small" themeColor="textSecondary">
            Enter your monthly income to continue
          </ThemedText>
        ) : null}
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
});
