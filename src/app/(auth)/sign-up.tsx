import { useState } from 'react';
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
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signUpWithEmail } from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 6;

export default function SignUpScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH && !submitting;

  async function handleSignUp() {
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const message = await signUpWithEmail(email.trim(), password);
    setSubmitting(false);
    if (message) setError(message);
    // On success, `session` updates and the (auth)/(tabs)/onboarding redirect gates
    // take over automatically — no explicit navigation needed here.
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
                Create your account
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                Your budget, synced everywhere you sign in.
              </ThemedText>
            </View>

            <View style={styles.fields}>
              <View style={styles.field}>
                <ThemedText type="smallBold">Email</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="smallBold">Password</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="smallBold">Confirm password</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />
              </View>

              <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
                <ThemedText type="link" themeColor="textSecondary" style={styles.forgotPassword}>
                  Forgot password?
                </ThemedText>
              </Pressable>

              {error ? (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.footer}>
              <Pressable
                disabled={!canSubmit}
                onPress={handleSignUp}
                style={[styles.button, { backgroundColor: theme.brand }, !canSubmit && styles.disabled]}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  {submitting ? 'Creating account…' : 'Sign up'}
                </ThemedText>
              </Pressable>

              <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={8}>
                <ThemedText type="link" themeColor="textSecondary" style={styles.footerLink}>
                  Already have an account? <ThemedText type="linkPrimary">Sign in</ThemedText>
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
  footerLink: {
    textAlign: 'center',
  },
  forgotPassword: {
    textAlign: 'right',
  },
});
