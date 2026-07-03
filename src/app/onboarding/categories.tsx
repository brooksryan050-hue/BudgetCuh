import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { ThemedText } from '@/components/themed-text';
import { CategoryIcon } from '@/components/ui/category-icon';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOnboardingDraft } from './_layout';

const SPENDING_CATEGORIES = DEFAULT_CATEGORIES.filter((c) => c.kind !== 'income');

export default function CategoriesScreen() {
  const theme = useTheme();
  const { draft, updateDraft } = useOnboardingDraft();

  function toggle(categoryId: string) {
    const isSelected = draft.selectedCategoryIds.includes(categoryId);
    updateDraft({
      selectedCategoryIds: isSelected
        ? draft.selectedCategoryIds.filter((id) => id !== categoryId)
        : [...draft.selectedCategoryIds, categoryId],
    });
  }

  return (
    <OnboardingScaffold
      step={2}
      totalSteps={4}
      title="What do you spend on?"
      subtitle="Pick your main spending categories — you can always add more later."
      onContinue={() => router.push('/onboarding/goal')}
      continueDisabled={draft.selectedCategoryIds.length === 0}>
      <View style={styles.grid}>
        {SPENDING_CATEGORIES.map((category) => {
          const selected = draft.selectedCategoryIds.includes(category.id);
          return (
            <Pressable
              key={category.id}
              onPress={() => toggle(category.id)}
              style={[
                styles.tile,
                { backgroundColor: theme.backgroundElement },
                selected && { backgroundColor: theme.backgroundSelected, borderColor: theme.brand },
              ]}>
              <CategoryIcon categoryId={category.id} size={32} />
              <ThemedText type="small" style={styles.tileLabel}>
                {category.name}
              </ThemedText>
            </Pressable>
          );
        })}
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
});
