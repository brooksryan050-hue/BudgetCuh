import { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PasswordInput } from '@/components/ui/password-input';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { updatePassword } from '@/lib/auth';
import { setPasswordRecoveryPending } from '@/store/auth-store';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Only reachable while auth-store's passwordRecovery flag is set (see
 * (auth)/_layout.tsx) — i.e. the user tapped a real recovery-link email, which set a
 * temporary session via auth-deep-link.ts. Submitting clears that flag, which lets
 * the normal session redirect take over and drop them straight into the app.
 */
export default function ResetPasswordScreen() {
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirmPasswordRef = useRef<TextInput>(null);

  const canSubmit = password.length >= MIN_PASSWORD_LENGTH && !submitting;

  async function handleSubmit() {
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const message = await updatePassword(password);
    setSubmitting(false);
    if (message) {
      setError(message);
      return;
    }
    setPasswordRecoveryPending(false);
    // (auth)/_layout.tsx's redirect gate takes over from here.
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            style={styles.content}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Set a new password
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                Choose a new password for your account.
              </ThemedText>
            </View>

            <View style={styles.fields}>
              <View style={styles.field}>
                <ThemedText type="smallBold">New password</ThemedText>
                <PasswordInput
                  placeholder="At least 8 characters"
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="new-password"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="smallBold">Confirm new password</ThemedText>
                <PasswordInput
                  ref={confirmPasswordRef}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {error ? (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.footer}>
              <Pressable
                disabled={!canSubmit}
                onPress={handleSubmit}
                style={[styles.button, { backgroundColor: theme.brand }, !canSubmit && styles.disabled]}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  {submitting ? 'Saving…' : 'Save new password'}
                </ThemedText>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  fields: {
    gap: Spacing.three,
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
  footer: {
    gap: Spacing.three,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
