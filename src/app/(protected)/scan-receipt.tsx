import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryIcon } from '@/components/ui/category-icon';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import { getCurrencyByCode } from '@/data/currencies';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { toISODate } from '@/lib/dates';
import { playTapSound, playTransactionAddedSound } from '@/lib/sound';
import { scanReceipt, type ParsedReceipt } from '@/lib/receipt-scan';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/budget-store';

function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  playTapSound();
}

const EXPENSE_CATEGORIES = DEFAULT_CATEGORIES.filter((c) => c.kind !== 'income');
const MAX_IMAGE_WIDTH = 1600;

interface Candidate {
  key: string;
  categoryId: string;
  label: string;
  originalAmount: number;
  convertedAmount: number | null;
  amount: string;
  note: string;
  included: boolean;
  expanded: boolean;
}

function candidatesFromReceipt(receipt: ParsedReceipt, useConverted: boolean): Candidate[] {
  return receipt.items.map((item, index) => {
    const convertedAmount = receipt.conversion?.convertedItems[index]?.amount ?? null;
    const amount = useConverted && convertedAmount != null ? convertedAmount : item.amount;
    const note = receipt.merchant
      ? receipt.items.length > 1
        ? `${receipt.merchant} — ${item.label}`
        : receipt.merchant
      : item.label;
    return {
      key: `item-${index}`,
      categoryId: item.categoryId,
      label: item.label,
      originalAmount: item.amount,
      convertedAmount,
      amount: `${amount}`,
      note,
      included: true,
      expanded: false,
    };
  });
}

type Phase = 'capture' | 'processing' | 'error' | 'review';

export default function ScanReceiptScreen() {
  const theme = useTheme();
  const profile = useBudgetStore((s) => s.profile);
  const accounts = useBudgetStore((s) => s.accounts);
  const addTransactions = useBudgetStore((s) => s.addTransactions);

  const homeCurrency = profile?.currency ?? 'USD';

  const [phase, setPhase] = useState<Phase>('capture');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [receipt, setReceipt] = useState<ParsedReceipt | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [useConverted, setUseConverted] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const date = toISODate(new Date());
  const accountId = accounts[0]?.id;

  async function processAsset(uri: string) {
    setPhase('processing');
    setErrorMessage(null);
    setPermissionDenied(false);
    try {
      const context = ImageManipulator.manipulate(uri);
      context.resize({ width: MAX_IMAGE_WIDTH });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });

      if (!saved.base64) {
        setErrorMessage("Couldn't process that photo. Please try again.");
        setPhase('error');
        return;
      }

      let result: ParsedReceipt;
      try {
        result = await scanReceipt({
          imageBase64: saved.base64,
          mediaType: 'image/jpeg',
          homeCurrency,
        });
      } catch {
        setErrorMessage("Couldn't reach the scanner — check your connection and try again.");
        setPhase('error');
        return;
      }

      if (!result.readable || result.items.length === 0) {
        setErrorMessage("Couldn't read that receipt — try retaking the photo somewhere well-lit, or enter it manually.");
        setPhase('error');
        return;
      }

      setReceipt(result);
      setUseConverted(Boolean(result.conversion));
      setCandidates(candidatesFromReceipt(result, Boolean(result.conversion)));
      setPhase('review');
    } catch {
      setErrorMessage("Couldn't process that photo. Please try again.");
      setPhase('error');
    }
  }

  async function handleTakePhoto() {
    tap();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Camera access is needed to scan a receipt.');
      setPermissionDenied(true);
      setPhase('error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    await processAsset(asset.uri);
  }

  async function handleChooseFromLibrary() {
    tap();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Photo library access is needed to scan a receipt.');
      setPermissionDenied(true);
      setPhase('error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    await processAsset(asset.uri);
  }

  function toggleUseConverted(next: boolean) {
    if (!receipt) return;
    setUseConverted(next);
    setCandidates((prev) =>
      prev.map((c) => ({
        ...c,
        amount: `${next && c.convertedAmount != null ? c.convertedAmount : c.originalAmount}`,
      }))
    );
  }

  function updateCandidate(key: string, patch: Partial<Candidate>) {
    setCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function handleAddTransactions() {
    if (isSaving) return;
    const toAdd = candidates.filter((c) => c.included && Number.isFinite(parseFloat(c.amount)) && parseFloat(c.amount) > 0);
    if (toAdd.length === 0) return;

    setIsSaving(true);
    addTransactions(
      toAdd.map((candidate) => ({
        amount: parseFloat(candidate.amount),
        type: 'expense' as const,
        categoryId: candidate.categoryId,
        date,
        notes: candidate.note.trim() || undefined,
        paymentMethod: 'card' as const,
        isRecurring: false,
        accountId,
      }))
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    playTransactionAddedSound();
    router.dismiss(2);
  }

  const includedCount = candidates.filter((c) => c.included).length;
  const activeCurrency = useConverted && receipt?.conversion ? homeCurrency : receipt?.receiptCurrency ?? homeCurrency;
  const activeSymbol = getCurrencyByCode(activeCurrency)?.symbol ?? activeCurrency;

  return (
    <ThemedView style={styles.container}>
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
          <ThemedText type="smallBold">Scan receipt</ThemedText>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {phase === 'capture' ? (
            <View style={styles.captureBlock}>
              <Ionicons name="receipt-outline" size={56} color={theme.textSecondary} />
              <ThemedText type="default" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                Take a photo of a receipt and we&rsquo;ll pull out the total, merchant, and category for you.
              </ThemedText>
              <Pressable
                style={[styles.captureButton, { backgroundColor: theme.brand }]}
                onPress={handleTakePhoto}>
                <Ionicons name="camera" size={20} color="#ffffff" />
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  Take photo
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.captureButton, { backgroundColor: theme.backgroundElement }]}
                onPress={handleChooseFromLibrary}>
                <Ionicons name="images-outline" size={20} color={theme.text} />
                <ThemedText type="smallBold">Choose from library</ThemedText>
              </Pressable>
            </View>
          ) : null}

          {phase === 'processing' ? (
            <View style={styles.captureBlock}>
              <ActivityIndicator size="large" color={theme.brand} />
              <ThemedText type="default" style={{ color: theme.textSecondary }}>
                Reading your receipt…
              </ThemedText>
            </View>
          ) : null}

          {phase === 'error' ? (
            <View style={styles.captureBlock}>
              <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
              <ThemedText type="default" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                {errorMessage}
              </ThemedText>
              <Pressable
                style={[styles.captureButton, { backgroundColor: theme.backgroundElement }]}
                onPress={() => {
                  tap();
                  setPermissionDenied(false);
                  setPhase('capture');
                }}>
                <Ionicons name="refresh" size={20} color={theme.text} />
                <ThemedText type="smallBold">Try again</ThemedText>
              </Pressable>
              {permissionDenied ? (
                <Pressable
                  style={[styles.captureButton, { backgroundColor: theme.backgroundElement }]}
                  onPress={() => {
                    tap();
                    Linking.openSettings();
                  }}>
                  <Ionicons name="settings-outline" size={20} color={theme.text} />
                  <ThemedText type="smallBold">Open Settings</ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {phase === 'review' && receipt ? (
            <View style={styles.reviewBlock}>
              <Pressable
                style={[styles.retakeButton, { backgroundColor: theme.backgroundElement }]}
                onPress={() => {
                  tap();
                  handleTakePhoto();
                }}>
                <Ionicons name="camera-reverse-outline" size={18} color={theme.text} />
                <ThemedText type="smallBold">Retake photo</ThemedText>
              </Pressable>

              <View style={[styles.merchantCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">{receipt.merchant ?? 'Receipt'}</ThemedText>
                {receipt.receiptDate ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {receipt.receiptDate}
                  </ThemedText>
                ) : null}
              </View>

              {receipt.conversion ? (
                <View style={[styles.conversionCard, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.conversionText}>
                    <ThemedText type="small">
                      This looks like it&rsquo;s in {receipt.receiptCurrency}. Convert to {homeCurrency} at today&rsquo;s rate
                      (1 {receipt.receiptCurrency} = {receipt.conversion.rate.toFixed(4)} {homeCurrency})?
                    </ThemedText>
                  </View>
                  <Switch value={useConverted} onValueChange={toggleUseConverted} />
                </View>
              ) : null}

              {candidates.map((candidate) => (
                <View key={candidate.key} style={[styles.candidateCard, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.candidateTopRow}>
                    <Pressable
                      hitSlop={8}
                      onPress={() => {
                        tap();
                        updateCandidate(candidate.key, { included: !candidate.included });
                      }}>
                      <Ionicons
                        name={candidate.included ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={candidate.included ? theme.brand : theme.textSecondary}
                      />
                    </Pressable>

                    <Pressable
                      style={styles.candidateCategory}
                      onPress={() => {
                        tap();
                        updateCandidate(candidate.key, { expanded: !candidate.expanded });
                      }}>
                      <CategoryIcon categoryId={candidate.categoryId} size={28} />
                      <ThemedText type="small" numberOfLines={1} style={styles.candidateCategoryLabel}>
                        {DEFAULT_CATEGORIES.find((c) => c.id === candidate.categoryId)?.name ?? 'Other'}
                      </ThemedText>
                      <Ionicons
                        name={candidate.expanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={theme.textSecondary}
                      />
                    </Pressable>

                    <View style={styles.candidateAmountRow}>
                      <ThemedText type="default">{activeSymbol}</ThemedText>
                      <TextInput
                        style={[styles.candidateAmountInput, { color: theme.text }]}
                        value={candidate.amount}
                        onChangeText={(v) => updateCandidate(candidate.key, { amount: v })}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {candidate.expanded ? (
                    <View style={styles.candidateCategoryGrid}>
                      {EXPENSE_CATEGORIES.map((category) => {
                        const selected = candidate.categoryId === category.id;
                        return (
                          <Pressable
                            key={category.id}
                            onPress={() => {
                              tap();
                              updateCandidate(candidate.key, { categoryId: category.id, expanded: false });
                            }}
                            style={[
                              styles.candidateCategoryTile,
                              { backgroundColor: theme.background },
                              selected && { borderColor: theme.brand },
                            ]}>
                            <CategoryIcon categoryId={category.id} size={24} />
                            <ThemedText type="small" numberOfLines={1} style={styles.candidateCategoryTileLabel}>
                              {category.name}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  <TextInput
                    style={[styles.candidateNoteInput, { color: theme.text, backgroundColor: theme.background }]}
                    value={candidate.note}
                    onChangeText={(v) => updateCandidate(candidate.key, { note: v })}
                    placeholder="Note"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              ))}

              <Pressable
                style={[
                  styles.addButton,
                  { backgroundColor: theme.brand },
                  (includedCount === 0 || isSaving) && styles.buttonDisabled,
                ]}
                disabled={includedCount === 0 || isSaving}
                onPress={handleAddTransactions}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  {includedCount > 1 ? `Add ${includedCount} transactions` : 'Add transaction'}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
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
    alignSelf: 'center',
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
  captureBlock: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.six,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    width: '100%',
  },
  reviewBlock: {
    gap: Spacing.three,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  merchantCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    gap: Spacing.one,
  },
  conversionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  conversionText: {
    flex: 1,
  },
  candidateCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  candidateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  candidateCategory: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  candidateCategoryLabel: {
    flexShrink: 1,
  },
  candidateAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  candidateAmountInput: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  candidateCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  candidateCategoryTile: {
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
  candidateCategoryTileLabel: {
    fontSize: 11,
  },
  candidateNoteInput: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  addButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
