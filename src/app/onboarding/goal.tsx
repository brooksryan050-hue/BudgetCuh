import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Pill } from '@/components/ui/pill';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';
import { useBudgetStore } from '@/store/budget-store';
import type { FinancialGoalType } from '@/types';
import { useOnboardingDraft } from './_layout';

const GOAL_OPTIONS: { type: FinancialGoalType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'travel', label: 'Travel', icon: 'airplane' },
  { type: 'emergency_fund', label: 'Emergency fund', icon: 'umbrella' },
  { type: 'rent', label: 'Rent', icon: 'home' },
  { type: 'business', label: 'Business', icon: 'briefcase' },
  { type: 'school', label: 'School', icon: 'school' },
  { type: 'general_savings', label: 'General savings', icon: 'wallet' },
];

export default function GoalScreen() {
  const theme = useTheme();
  const { draft, updateDraft } = useOnboardingDraft();
  const completeOnboarding = useBudgetStore((s) => s.completeOnboarding);
  const session = useAuthStore((s) => s.session);

  const canFinish = draft.financialGoalType !== null && parseFloat(draft.savingsGoalAmount) > 0;

  function handleFinish() {
    if (!canFinish || !draft.financialGoalType || !session) return;
    completeOnboarding({
      id: session.user.id,
      name: draft.name.trim(),
      currency: draft.currency,
      monthlyIncome: parseFloat(draft.monthlyIncome) || 0,
      financialGoalType: draft.financialGoalType,
      savingsGoalAmount: parseFloat(draft.savingsGoalAmount) || 0,
      savingsGoalCadence: draft.savingsGoalCadence,
      selectedCategoryIds: draft.selectedCategoryIds,
      dailyReminderEnabled: false,
      dailyReminderHour: 18,
    });
    router.replace('/(tabs)');
  }

  return (
    <OnboardingScaffold
      step={3}
      totalSteps={4}
      title="What are you saving for?"
      subtitle="Choose your main goal and how much you'd like to save."
      continueLabel="Finish setup"
      onContinue={handleFinish}
      continueDisabled={!canFinish}>
      <View style={styles.grid}>
        {GOAL_OPTIONS.map((option) => {
          const selected = draft.financialGoalType === option.type;
          return (
            <Pressable
              key={option.type}
              onPress={() => updateDraft({ financialGoalType: option.type })}
              style={[
                styles.tile,
                { backgroundColor: theme.backgroundElement },
                selected && { backgroundColor: theme.backgroundSelected, borderColor: theme.brand },
              ]}>
              <Ionicons name={option.icon} size={24} color={selected ? theme.brand : theme.textSecondary} />
              <ThemedText type="small" style={styles.tileLabel}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Savings target</ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          value={draft.savingsGoalAmount}
          onChangeText={(savingsGoalAmount) => updateDraft({ savingsGoalAmount })}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">How often?</ThemedText>
        <View style={styles.pillRow}>
          <Pill
            label="Weekly"
            selected={draft.savingsGoalCadence === 'weekly'}
            onPress={() => updateDraft({ savingsGoalCadence: 'weekly' })}
          />
          <Pill
            label="Monthly"
            selected={draft.savingsGoalCadence === 'monthly'}
            onPress={() => updateDraft({ savingsGoalCadence: 'monthly' })}
          />
        </View>
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: '30%',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: Spacing.two,
    marginBottom: Spacing.two,
  },
  tileLabel: {
    textAlign: 'center',
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  pillRow: {
    flexDirection: 'row',
  },
});
