import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfettiBurst } from '@/components/ui/confetti-burst';
import { SavingsGoalCard } from '@/components/goals/savings-goal-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { addDays, toISODate } from '@/lib/dates';
import { playChallengeCompleteSound } from '@/lib/sound';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/budget-store';
import type { FinancialGoalType, ISODate } from '@/types';

const GOAL_ICONS: { icon: string; goalType: FinancialGoalType }[] = [
  { icon: 'airplane', goalType: 'travel' },
  { icon: 'umbrella', goalType: 'emergency_fund' },
  { icon: 'home', goalType: 'rent' },
  { icon: 'briefcase', goalType: 'business' },
  { icon: 'school', goalType: 'school' },
  { icon: 'wallet', goalType: 'general_savings' },
];

export default function SavingsGoalsScreen() {
  const theme = useTheme();
  const profile = useBudgetStore((s) => s.profile);
  const savingsGoals = useBudgetStore((s) => s.savingsGoals);
  const addSavingsGoal = useBudgetStore((s) => s.addSavingsGoal);
  const updateSavingsGoal = useBudgetStore((s) => s.updateSavingsGoal);
  const deleteSavingsGoal = useBudgetStore((s) => s.deleteSavingsGoal);
  const contributeSavingsGoal = useBudgetStore((s) => s.contributeSavingsGoal);

  const currency = profile?.currency ?? 'USD';
  const today = useMemo(() => new Date(), []);

  const [formVisible, setFormVisible] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>(GOAL_ICONS[5].icon);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState<ISODate>(toISODate(addDays(today, 90)));
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeError, setContributeError] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  const contributingGoal = useMemo(
    () => savingsGoals.find((g) => g.id === contributeGoalId),
    [savingsGoals, contributeGoalId]
  );

  function openCreateForm() {
    setEditingGoalId(null);
    setName('');
    setTargetAmount('');
    setSelectedIcon(GOAL_ICONS[5].icon);
    setHasDeadline(false);
    setDeadline(toISODate(addDays(today, 90)));
    setFormError(null);
    setFormVisible(true);
  }

  function openEditForm(goalId: string) {
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return;
    setEditingGoalId(goal.id);
    setName(goal.name);
    setTargetAmount(`${goal.targetAmount}`);
    setSelectedIcon(goal.icon);
    setHasDeadline(!!goal.deadline);
    setDeadline(goal.deadline ?? toISODate(addDays(today, 90)));
    setFormError(null);
    setFormVisible(true);
  }

  function closeForm() {
    setFormVisible(false);
    setFormError(null);
  }

  function handleSubmitForm() {
    if (!name.trim()) {
      setFormError('Give this goal a name.');
      return;
    }
    const parsed = parseFloat(targetAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Enter a target amount greater than 0.');
      return;
    }

    const payload = {
      name: name.trim(),
      icon: selectedIcon,
      targetAmount: parsed,
      deadline: hasDeadline ? deadline : undefined,
    };

    if (editingGoalId) {
      updateSavingsGoal(editingGoalId, payload);
    } else {
      addSavingsGoal(payload);
    }
    closeForm();
  }

  function handleDeleteGoal() {
    if (!editingGoalId) return;
    deleteSavingsGoal(editingGoalId);
    setConfirmDeleteVisible(false);
    closeForm();
  }

  function handleContribute() {
    const parsed = parseFloat(contributeAmount);
    if (!contributingGoal) return;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setContributeError('Enter an amount greater than 0.');
      return;
    }

    const wasBelowTarget = contributingGoal.currentAmount < contributingGoal.targetAmount;
    const willReachTarget = contributingGoal.currentAmount + parsed >= contributingGoal.targetAmount;

    contributeSavingsGoal(contributingGoal.id, parsed, toISODate(new Date()));
    setContributeAmount('');
    setContributeError(null);
    setContributeGoalId(null);

    if (wasBelowTarget && willReachTarget) {
      setConfettiTrigger((n) => n + 1);
      playChallengeCompleteSound();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">Savings goals</ThemedText>
          <Pressable hitSlop={8} onPress={openCreateForm}>
            <Ionicons name="add-circle" size={26} color={theme.brand} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {savingsGoals.length === 0 ? (
            <EmptyState
              icon="flag-outline"
              title="No savings goals yet"
              message="Create a goal — emergency fund, vacation, a new phone — and start chipping away."
            />
          ) : (
            savingsGoals.map((goal) => (
              <SavingsGoalCard
                key={goal.id}
                goal={goal}
                currency={currency}
                onPress={() => {
                  setContributeError(null);
                  setContributeGoalId(goal.id);
                }}
                onEdit={() => openEditForm(goal.id)}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={closeForm}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={closeForm}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHeader}>
                <ThemedText type="subtitle">{editingGoalId ? 'Edit savings goal' : 'New savings goal'}</ThemedText>
                <Pressable hitSlop={8} onPress={closeForm}>
                  <Ionicons name="close" size={22} color={theme.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.iconRow}>
                {GOAL_ICONS.map(({ icon }) => (
                  <Pressable
                    key={icon}
                    onPress={() => setSelectedIcon(icon)}
                    style={[
                      styles.iconOption,
                      { backgroundColor: theme.backgroundElement },
                      selectedIcon === icon && { backgroundColor: theme.brand },
                    ]}>
                    <Ionicons
                      name={icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={selectedIcon === icon ? '#ffffff' : theme.textSecondary}
                    />
                  </Pressable>
                ))}
              </View>
              <ThemedText type="smallBold">Goal name</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Vacation fund"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />
              <ThemedText type="smallBold" style={styles.fieldLabel}>
                Target amount
              </ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="decimal-pad"
              />

              <Pressable style={styles.deadlineRow} onPress={() => setHasDeadline((v) => !v)}>
                <ThemedText type="smallBold">Set a deadline</ThemedText>
                <Switch value={hasDeadline} pointerEvents="none" />
              </Pressable>
              {hasDeadline ? (
                <DatePickerField
                  value={deadline}
                  onChange={setDeadline}
                  minDate={today}
                  maxDate={new Date(today.getFullYear() + 10, today.getMonth(), today.getDate())}
                  quickPicks={[
                    { label: '3 months', date: addDays(today, 90) },
                    { label: '6 months', date: addDays(today, 182) },
                    { label: '1 year', date: addDays(today, 365) },
                  ]}
                />
              ) : null}

              {formError ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {formError}
                </ThemedText>
              ) : null}

              <Pressable style={[styles.primaryButton, { backgroundColor: theme.brand }]} onPress={handleSubmitForm}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  {editingGoalId ? 'Save changes' : 'Create goal'}
                </ThemedText>
              </Pressable>

              {editingGoalId ? (
                <Pressable
                  style={[styles.deleteButton, { backgroundColor: theme.dangerBackground }]}
                  onPress={() => setConfirmDeleteVisible(true)}>
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    Delete goal
                  </ThemedText>
                </Pressable>
              ) : null}
            </ScrollView>
          </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={contributeGoalId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setContributeError(null);
          setContributeGoalId(null);
        }}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={[styles.overlay, { backgroundColor: theme.overlay }]}
            onPress={() => {
              setContributeError(null);
              setContributeGoalId(null);
            }}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
              {contributingGoal ? (
                <>
                  <View style={styles.sheetHeader}>
                    <ThemedText type="subtitle">Add to {contributingGoal.name}</ThemedText>
                    <Pressable
                      hitSlop={8}
                      onPress={() => {
                        setContributeError(null);
                        setContributeGoalId(null);
                      }}>
                      <Ionicons name="close" size={22} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                  <TextInput
                    style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.textSecondary}
                    value={contributeAmount}
                    onChangeText={setContributeAmount}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                  {contributeError ? (
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      {contributeError}
                    </ThemedText>
                  ) : null}
                  <Pressable style={[styles.primaryButton, { backgroundColor: theme.success }]} onPress={handleContribute}>
                    <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                      Add contribution
                    </ThemedText>
                  </Pressable>
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete this goal?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteGoal}
        onCancel={() => setConfirmDeleteVisible(false)}
      />

      <ConfettiBurst trigger={confettiTrigger} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    marginTop: Spacing.one,
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  primaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.three,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
});
