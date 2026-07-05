import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { TransactionFeedbackPopup } from '@/components/ui/transaction-feedback-popup';
import { Pill } from '@/components/ui/pill';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { toISODate } from '@/lib/dates';
import { playTapSound } from '@/lib/sound';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/budget-store';
import type { PaymentMethod, RecurringInterval, TransactionType } from '@/types';

function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  playTapSound();
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

export default function TransactionFormScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(params.id);

  const transactions = useBudgetStore((s) => s.transactions);
  const accounts = useBudgetStore((s) => s.accounts);
  const addTransaction = useBudgetStore((s) => s.addTransaction);
  const updateTransaction = useBudgetStore((s) => s.updateTransaction);
  const deleteTransaction = useBudgetStore((s) => s.deleteTransaction);

  const existing = useMemo(
    () => transactions.find((t) => t.id === params.id),
    [transactions, params.id]
  );

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(existing ? `${existing.amount}` : '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? 'cat-groceries');
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id);
  const [date, setDate] = useState(existing?.date ?? toISODate(new Date()));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existing?.paymentMethod ?? 'card');
  const [isRecurring, setIsRecurring] = useState(existing?.isRecurring ?? false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>(
    existing?.recurringInterval ?? 'monthly'
  );
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [piggyTrigger, setPiggyTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const amountInputRef = useRef<TextInput>(null);

  const availableCategories = DEFAULT_CATEGORIES.filter((c) =>
    type === 'income' ? c.kind !== 'expense' : c.kind !== 'income'
  );

  const parsedAmount = parseFloat(amount);
  const canSave = Number.isFinite(parsedAmount) && parsedAmount > 0;

  function handleSave(addAnother: boolean) {
    if (!canSave || isSaving) return;
    const payload = {
      amount: parsedAmount,
      type,
      categoryId: type === 'income' ? 'cat-income' : categoryId,
      date,
      notes: notes.trim() || undefined,
      paymentMethod,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      accountId,
    };

    if (isEditing && existing) {
      updateTransaction(existing.id, payload);
      router.back();
      return;
    }

    addTransaction(payload);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setPiggyTrigger((n) => n + 1);
    setIsSaving(true);

    if (addAnother) {
      setAddedCount((n) => n + 1);
      setTimeout(() => {
        setAmount('');
        setNotes('');
        setIsSaving(false);
        amountInputRef.current?.focus();
      }, 700);
      return;
    }

    setTimeout(() => router.back(), 700);
  }

  function handleDelete() {
    if (!existing) return;
    deleteTransaction(existing.id);
    setConfirmDeleteVisible(false);
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.header}>
            <Pressable
              hitSlop={8}
              style={styles.headerButton}
              onPress={() => {
                tap();
                router.back();
              }}>
              <ThemedText style={[styles.headerButtonText, { color: theme.brand }]}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="smallBold">{isEditing ? 'Edit transaction' : 'Add transaction'}</ThemedText>
            <Pressable
              hitSlop={8}
              style={styles.headerButton}
              disabled={isSaving || (addedCount === 0 && !canSave)}
              onPress={() => {
                tap();
                if (canSave) {
                  handleSave(false);
                } else {
                  router.back();
                }
              }}>
              <ThemedText
                style={[
                  styles.headerButtonText,
                  { color: isSaving || (addedCount === 0 && !canSave) ? theme.textSecondary : theme.brand },
                ]}>
                {isEditing ? 'Save' : addedCount > 0 ? 'Done' : 'Save'}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {addedCount > 0 ? (
              <View style={[styles.addedBanner, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {addedCount} {addedCount === 1 ? 'transaction' : 'transactions'} added this session
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.typeToggle}>
              <Pressable
                style={[
                  styles.typeButton,
                  { backgroundColor: theme.backgroundElement },
                  type === 'expense' && { backgroundColor: theme.backgroundSelected },
                ]}
                onPress={() => {
                  tap();
                  setType('expense');
                }}>
                <ThemedText type="smallBold">Expense</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.typeButton,
                  { backgroundColor: theme.backgroundElement },
                  type === 'income' && { backgroundColor: theme.backgroundSelected },
                ]}
                onPress={() => {
                  tap();
                  setType('income');
                }}>
                <ThemedText type="smallBold">Income</ThemedText>
              </Pressable>
            </View>

            <View style={styles.amountRow}>
              <ThemedText type="title" style={styles.currencySign}>
                $
              </ThemedText>
              <TextInput
                ref={amountInputRef}
                style={[styles.amountInput, { color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            {accounts.length > 1 ? (
              <View style={styles.field}>
                <ThemedText type="smallBold">Account</ThemedText>
                <View style={styles.pillRow}>
                  {accounts.map((account) => (
                    <Pill
                      key={account.id}
                      label={account.name}
                      selected={accountId === account.id}
                      onPress={() => {
                        tap();
                        setAccountId(account.id);
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {type === 'expense' ? (
              <View style={styles.field}>
                <ThemedText type="smallBold">Category</ThemedText>
                <View style={styles.categoryGrid}>
                  {availableCategories.map((category) => {
                    const selected = categoryId === category.id;
                    return (
                      <Pressable
                        key={category.id}
                        onPress={() => {
                          tap();
                          setCategoryId(category.id);
                        }}
                        style={[
                          styles.categoryTile,
                          { backgroundColor: theme.backgroundElement },
                          selected && { backgroundColor: theme.backgroundSelected, borderColor: theme.brand },
                        ]}>
                        <CategoryIcon categoryId={category.id} size={28} />
                        <ThemedText type="small" style={styles.categoryLabel} numberOfLines={1}>
                          {category.name}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.field}>
              <ThemedText type="smallBold">Date</ThemedText>
              <DatePickerField value={date} onChange={setDate} />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Payment method</ThemedText>
              <View style={styles.pillRow}>
                {PAYMENT_METHODS.map((method) => (
                  <Pill
                    key={method.value}
                    label={method.label}
                    selected={paymentMethod === method.value}
                    onPress={() => {
                      tap();
                      setPaymentMethod(method.value);
                    }}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Notes</ThemedText>
              <TextInput
                style={[styles.notesInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Optional"
                placeholderTextColor={theme.textSecondary}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <Pressable
              style={[styles.recurringRow, { backgroundColor: theme.backgroundElement }]}
              onPress={() => {
                tap();
                setIsRecurring((v) => !v);
              }}>
              <View style={styles.recurringLabel}>
                <Ionicons name="repeat" size={18} color={theme.textSecondary} />
                <ThemedText type="default">Recurring transaction</ThemedText>
              </View>
              <Switch value={isRecurring} pointerEvents="none" />
            </Pressable>

            {isRecurring ? (
              <View style={styles.pillRow}>
                <Pill
                  label="Weekly"
                  selected={recurringInterval === 'weekly'}
                  onPress={() => {
                    tap();
                    setRecurringInterval('weekly');
                  }}
                />
                <Pill
                  label="Monthly"
                  selected={recurringInterval === 'monthly'}
                  onPress={() => {
                    tap();
                    setRecurringInterval('monthly');
                  }}
                />
              </View>
            ) : null}

            {!isEditing ? (
              <Pressable
                style={[
                  styles.addAnotherButton,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.brand },
                  (!canSave || isSaving) && styles.buttonDisabled,
                ]}
                disabled={!canSave || isSaving}
                onPress={() => {
                  tap();
                  handleSave(true);
                }}>
                <Ionicons name="add-circle-outline" size={18} color={theme.brand} />
                <ThemedText type="smallBold" style={{ color: theme.brand }}>
                  Save & add another
                </ThemedText>
              </Pressable>
            ) : null}

            {isEditing ? (
              <Pressable
                style={[styles.deleteButton, { backgroundColor: theme.dangerBackground }]}
                onPress={() => {
                  tap();
                  setConfirmDeleteVisible(true);
                }}>
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  Delete transaction
                </ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete transaction?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
      <TransactionFeedbackPopup trigger={piggyTrigger} variant={type} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safeArea: { flex: 1, width: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  headerButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  currencySign: {
    fontSize: 40,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '600',
    minWidth: 120,
    maxWidth: 220,
    textAlign: 'left',
  },
  field: {
    gap: Spacing.two,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryTile: {
    width: '22%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: Spacing.two,
    marginBottom: Spacing.two,
  },
  categoryLabel: {
    fontSize: 11,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  notesInput: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  recurringLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  addAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  addedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
});
