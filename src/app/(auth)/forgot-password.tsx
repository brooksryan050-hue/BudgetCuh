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
import { sendPasswordResetEmail } from '@/lib/auth';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = email.trim().length > 0 && !submitting;

  async function handleSend() {
    setError(null);
    setSubmitting(true);
    const message = await sendPasswordResetEmail(email.trim());
    setSubmitting(false);
    if (message) {
      setError(message);
    } else {
      setSent(true);
    }
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
                Reset your password
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                {sent
                  ? "If there's an account for that email, a reset link is on its way."
                  : "Enter your email and we'll send you a link to reset your password."}
              </ThemedText>
            </View>

            {sent ? null : (
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
                    returnKeyType="done"
                    onSubmitEditing={handleSend}
                  />
                </View>
              </View>
            )}

            {error ? (
              <ThemedText type="small" themeColor="danger" style={styles.footerLink}>
                {error}
              </ThemedText>
            ) : null}

            <View style={styles.footer}>
              {sent ? (
                <>
                  <Pressable disabled={submitting} onPress={handleSend} hitSlop={8}>
                    <ThemedText type="link" themeColor="textSecondary" style={styles.footerLink}>
                      {submitting ? (
                        'Sending…'
                      ) : (
                        <>Didn&apos;t get it? <ThemedText type="linkPrimary">Resend</ThemedText></>
                      )}
                    </ThemedText>
                  </Pressable>
                  <Pressable onPress={() => setSent(false)} hitSlop={8}>
                    <ThemedText type="link" themeColor="textSecondary" style={styles.footerLink}>
                      Wrong email? <ThemedText type="linkPrimary">Edit email</ThemedText>
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  disabled={!canSubmit}
                  onPress={handleSend}
                  style={[styles.button, { backgroundColor: theme.brand }, !canSubmit && styles.disabled]}>
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                    {submitting ? 'Sending…' : 'Send reset link'}
                  </ThemedText>
                </Pressable>
              )}

              <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={8}>
                <ThemedText type="link" themeColor="textSecondary" style={styles.footerLink}>
                  Back to <ThemedText type="linkPrimary">sign in</ThemedText>
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
});
