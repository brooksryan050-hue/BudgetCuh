import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCurrencyFormatter } from '@/lib/currency';
import { useBudgetStore } from '@/store/budget-store';
import type { Account } from '@/types';

export function AccountBalanceCard() {
  const theme = useTheme();
  const profile = useBudgetStore((s) => s.profile);
  const accounts = useBudgetStore((s) => s.accounts);
  const addAccount = useBudgetStore((s) => s.addAccount);
  const updateAccount = useBudgetStore((s) => s.updateAccount);
  const deleteAccount = useBudgetStore((s) => s.deleteAccount);

  const currency = profile?.currency ?? 'USD';
  const formatter = getCurrencyFormatter(currency);

  const [containerWidth, setContainerWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [balanceInput, setBalanceInput] = useState('');
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');

  function openEdit(account: Account) {
    setEditingAccountId(account.id);
    setBalanceInput(`${account.balance}`);
  }

  function saveBalance() {
    const parsed = parseFloat(balanceInput);
    if (editingAccountId && Number.isFinite(parsed)) {
      updateAccount(editingAccountId, { balance: parsed });
    }
    setEditingAccountId(null);
  }

  function confirmDelete() {
    if (editingAccountId) deleteAccount(editingAccountId);
    setConfirmDeleteVisible(false);
    setEditingAccountId(null);
  }

  function createAccount() {
    const parsed = parseFloat(newBalance) || 0;
    if (!newName.trim()) return;
    addAccount({
      name: newName.trim(),
      icon: 'wallet',
      color: theme.brand,
      currency,
      balance: parsed,
    });
    setNewName('');
    setNewBalance('');
    setAddVisible(false);
  }

  return (
    <View style={styles.measureWrap} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      {containerWidth > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width: containerWidth }}
          scrollEventThrottle={16}
          onScroll={(e) =>
            setPageIndex(Math.round(e.nativeEvent.contentOffset.x / containerWidth))
          }>
          {accounts.map((account) => {
            const isNegative = account.balance < 0;

            return (
              <View key={account.id} style={{ width: containerWidth }}>
                <Card style={styles.balanceCard}>
                  <View style={styles.headerRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {account.name}
                    </ThemedText>
                    <Pressable hitSlop={8} onPress={() => openEdit(account)} style={styles.editButton}>
                      <Ionicons name="settings-outline" size={14} color={theme.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        Manage
                      </ThemedText>
                    </Pressable>
                  </View>
                  <ThemedText
                    type="title"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                    style={[styles.balance, { color: isNegative ? theme.danger : theme.success }]}>
                    {formatter.format(account.balance)}
                  </ThemedText>
                </Card>
              </View>
            );
          })}

          <View style={{ width: containerWidth }}>
            <Pressable onPress={() => setAddVisible(true)}>
              <Card style={styles.addCard}>
                <Ionicons name="add-circle-outline" size={28} color={theme.brand} />
                <ThemedText type="smallBold" style={{ color: theme.brand }}>
                  Add account
                </ThemedText>
              </Card>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}

      <View style={styles.dots}>
        {[...accounts, { id: 'add' }].map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.dot,
              { backgroundColor: index === pageIndex ? theme.brand : theme.backgroundSelected },
            ]}
          />
        ))}
      </View>

      <Modal visible={editingAccountId !== null} transparent animationType="fade" onRequestClose={() => setEditingAccountId(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={() => setEditingAccountId(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
              <ThemedText type="subtitle">Manage account</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sheetHint}>
                There&apos;s no bank connection, so set this to match your real balance whenever you like.
              </ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                value={balanceInput}
                onChangeText={setBalanceInput}
                keyboardType="numbers-and-punctuation"
                autoFocus
              />
              <Pressable style={[styles.primaryButton, { backgroundColor: theme.brand }]} onPress={saveBalance}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  Save
                </ThemedText>
              </Pressable>
              {accounts.length > 1 ? (
                <Pressable
                  style={[styles.deleteButton, { backgroundColor: theme.dangerBackground }]}
                  onPress={() => setConfirmDeleteVisible(true)}>
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    Delete account
                  </ThemedText>
                </Pressable>
              ) : null}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={() => setAddVisible(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
              <ThemedText type="subtitle">New account</ThemedText>
              <ThemedText type="smallBold" style={styles.fieldLabel}>
                Name
              </ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Savings account"
                placeholderTextColor={theme.textSecondary}
                value={newName}
                onChangeText={setNewName}
              />
              <ThemedText type="smallBold" style={styles.fieldLabel}>
                Starting balance
              </ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                value={newBalance}
                onChangeText={setNewBalance}
                keyboardType="numbers-and-punctuation"
              />
              <Pressable style={[styles.primaryButton, { backgroundColor: theme.brand }]} onPress={createAccount}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  Create account
                </ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete this account?"
        message="This can't be undone. Its transactions won't be deleted, but will no longer be linked to it."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  measureWrap: {
    width: '100%',
  },
  balanceCard: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balance: {
    fontSize: 40,
    lineHeight: 46,
  },
  addCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 96,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    gap: Spacing.two,
  },
  sheetHint: {
    marginBottom: Spacing.one,
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
  primaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
});
