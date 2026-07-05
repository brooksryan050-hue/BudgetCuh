import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry'>;

/**
 * Shared password field: dark/light-aware input with a show/hide eye toggle.
 * Used by sign-in, sign-up, and reset-password — all forward a ref so the
 * screen can chain focus to/from this field via onSubmitEditing.
 */
export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(function PasswordInput(
  { style, ...props },
  ref
) {
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.backgroundElement }]}>
      <TextInput
        ref={ref}
        style={[styles.input, { color: theme.text }, style]}
        placeholderTextColor={theme.textSecondary}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        {...props}
      />
      <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingRight: Spacing.three,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
});
