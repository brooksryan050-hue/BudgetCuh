import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { BudgetCategoryRow } from '@/components/budget/budget-category-row';
import { DEFAULT_CATEGORIES, getCategoryById } from '@/data/categories';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useBudgetUsages } from '@/hooks/use-budget-usages';
import { useTheme } from '@/hooks/use-theme';
import { getCurrencyFormatter } from '@/lib/currency';
import { useBudgetStore } from '@/store/budget-store';

export default function BudgetScreen() {
  const theme = useTheme();
  const referenceDate = useMemo(() => new Date(), []);
  const profile = useBudgetStore((s) => s.profile);
  const budgets = useBudgetStore((s) => s.budgets);
  const upsertBudget = useBudgetStore((s) => s.upsertBudget);
  const removeBudget = useBudgetStore((s) => s.removeBudget);
  const usages = useBudgetUsages(referenceDate);

  const currency = profile?.currency ?? 'USD';
  const formatter = getCurrencyFormatter(currency, 0);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = DEFAULT_CATEGORIES.filter(
    (c) => c.kind !== 'income' && !budgetedCategoryIds.has(c.id)
  );

  const totalSpent = usages.reduce((sum, u) => sum + u.spent, 0);
  const totalLimit = usages.reduce((sum, u) => sum + u.limit, 0);

  function openEdit(categoryId: string) {
    const existing = budgets.find((b) => b.categoryId === categoryId);
    setEditingCategoryId(categoryId);
    setLimitInput(existing ? `${existing.monthlyLimit}` : '');
  }

  function saveLimit() {
    const parsed = parseFloat(limitInput);
    if (!editingCategoryId || !Number.isFinite(parsed) || parsed <= 0) return;
    upsertBudget(editingCategoryId, parsed);
    setEditingCategoryId(null);
    setLimitInput('');
    setPickerVisible(false);
  }

  function handleDelete() {
    if (!confirmDeleteId) return;
    const budget = budgets.find((b) => b.categoryId === confirmDeleteId);
    if (budget) removeBudget(budget.id);
    setConfirmDeleteId(null);
    setEditingCategoryId(null);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Budget
            </ThemedText>
            <Pressable
              style={[styles.addButton, { backgroundColor: theme.brand }]}
              onPress={() => setPickerVisible(true)}>
              <Ionicons name="add" size={22} color="#ffffff" />
            </Pressable>
          </View>

          {usages.length > 0 ? (
            <Card style={styles.summaryCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Total budgeted this month
              </ThemedText>
              <ThemedText type="subtitle">
                {formatter.format(totalSpent)}{' '}
                <ThemedText type="default" themeColor="textSecondary">
                  of {formatter.format(totalLimit)}
                </ThemedText>
              </ThemedText>
            </Card>
          ) : null}

          {usages.length === 0 ? (
            <EmptyState
              icon="pie-chart-outline"
              title="No budgets yet"
              message="Set a limit for a category to start tracking your spending against it."
            />
          ) : (
            <Card style={styles.listCard}>
              {usages.map((usage, index) => (
                <View key={usage.budgetId}>
                  <BudgetCategoryRow usage={usage} currency={currency} onPress={() => openEdit(usage.categoryId)} />
                  {index < usages.length - 1 ? (
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  ) : null}
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={pickerVisible && !editingCategoryId}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={() => setPickerVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              Choose a category
            </ThemedText>
            <ScrollView style={styles.pickerList}>
              {availableCategories.map((category) => (
                <Pressable
                  key={category.id}
                  style={styles.pickerRow}
                  onPress={() => openEdit(category.id)}>
                  <CategoryIcon categoryId={category.id} size={32} />
                  <ThemedText type="default">{category.name}</ThemedText>
                </Pressable>
              ))}
              {availableCategories.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Every category already has a budget.
                </ThemedText>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={editingCategoryId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCategoryId(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={[styles.overlay, { backgroundColor: theme.overlay }]}
            onPress={() => setEditingCategoryId(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
              {editingCategoryId ? (
                <>
                  <View style={styles.editHeader}>
                    <CategoryIcon categoryId={editingCategoryId} size={40} />
                    <ThemedText type="subtitle">{getCategoryById(editingCategoryId).name}</ThemedText>
                  </View>
                  <ThemedText type="smallBold">Monthly limit</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.textSecondary}
                    value={limitInput}
                    onChangeText={setLimitInput}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                  <Pressable style={[styles.saveButton, { backgroundColor: theme.brand }]} onPress={saveLimit}>
                    <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                      Save
                    </ThemedText>
                  </Pressable>
                  {budgetedCategoryIds.has(editingCategoryId) ? (
                    <Pressable
                      style={[styles.deleteButton, { backgroundColor: theme.dangerBackground }]}
                      onPress={() => setConfirmDeleteId(editingCategoryId)}>
                      <ThemedText type="smallBold" style={{ color: theme.danger }}>
                        Remove budget
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={confirmDeleteId !== null}
        title="Remove this budget?"
        confirmLabel="Remove"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%' },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    gap: Spacing.one,
  },
  listCard: {
    paddingVertical: Spacing.one,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
    maxHeight: '80%',
  },
  sheetTitle: {
    marginBottom: Spacing.one,
  },
  pickerList: {
    gap: Spacing.one,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  editHeader: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  saveButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
});
