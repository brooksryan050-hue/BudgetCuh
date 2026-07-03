import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Pill } from '@/components/ui/pill';
import { CURRENCIES, getCurrencyByCode } from '@/data/currencies';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CurrencyPickerProps = {
  value: string;
  onChange: (code: string) => void;
  /** Render as a plain inline grid instead of a tap-to-open field (used in onboarding). */
  inline?: boolean;
};

export function CurrencyPicker({ value, onChange, inline }: CurrencyPickerProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(!!inline);
  const [customCode, setCustomCode] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const knownCurrency = getCurrencyByCode(value);

  function selectCode(code: string) {
    onChange(code);
    setShowCustomInput(false);
    if (!inline) setVisible(false);
  }

  function submitCustomCode() {
    const code = customCode.trim().toUpperCase().slice(0, 3);
    if (code.length === 3) {
      selectCode(code);
      setCustomCode('');
    }
  }

  const grid = (
    <View style={styles.grid}>
      {CURRENCIES.map((currency) => (
        <Pill
          key={currency.code}
          label={`${currency.symbol} ${currency.code}`}
          selected={value === currency.code}
          onPress={() => selectCode(currency.code)}
        />
      ))}
      <Pill
        label={knownCurrency ? 'Other' : `Other (${value})`}
        selected={!knownCurrency}
        onPress={() => setShowCustomInput(true)}
      />
      {showCustomInput || !knownCurrency ? (
        <View style={styles.customRow}>
          <TextInput
            style={[styles.customInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            placeholder="e.g. ISK"
            placeholderTextColor={theme.textSecondary}
            value={customCode}
            onChangeText={(text) => setCustomCode(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={3}
            onSubmitEditing={submitCustomCode}
          />
          <Pressable
            style={[styles.customButton, { backgroundColor: theme.brand }]}
            onPress={submitCustomCode}>
            <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
              Use
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (inline) {
    return grid;
  }

  return (
    <>
      <Pressable
        style={[styles.field, { backgroundColor: theme.backgroundElement }]}
        onPress={() => setVisible(true)}>
        <Ionicons name="cash-outline" size={18} color={theme.textSecondary} />
        <ThemedText type="default" style={styles.fieldValue}>
          {knownCurrency ? `${knownCurrency.symbol} ${knownCurrency.name} (${value})` : value}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.brand }}>
          Edit
        </ThemedText>
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={() => setVisible(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              Choose a currency
            </ThemedText>
            <ScrollView style={styles.sheetScroll}>{grid}</ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  fieldValue: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '75%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
  },
  sheetTitle: {
    marginBottom: Spacing.two,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: Spacing.two,
  },
  customRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    marginTop: Spacing.one,
  },
  customInput: {
    flex: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  customButton: {
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
