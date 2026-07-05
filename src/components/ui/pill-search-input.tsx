import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';

type PillSearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

/** Translucent pill-shaped search box, meant to sit over a gradient hero. */
export function PillSearchInput({ value, onChangeText, placeholder = 'Search' }: PillSearchInputProps) {
  return (
    <View style={styles.pill}>
      <Ionicons name="search" size={18} color="rgba(255,255,255,0.8)" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.65)"
        returnKeyType="search"
        numberOfLines={1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    height: 44,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 18,
    paddingVertical: 0,
  },
});
