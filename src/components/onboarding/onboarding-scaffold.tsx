import type { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type OnboardingScaffoldProps = {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  continueLabel?: string;
  onContinue: () => void;
  continueDisabled?: boolean;
  showBack?: boolean;
};

export function OnboardingScaffold({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  continueLabel = 'Continue',
  onContinue,
  continueDisabled,
  showBack = true,
}: OnboardingScaffoldProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
          <View style={styles.headerRow}>
            {showBack && router.canGoBack() ? (
              <Pressable hitSlop={8} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
              </Pressable>
            ) : (
              <View style={{ width: 24 }} />
            )}
            <View style={styles.dots}>
              {Array.from({ length: totalSteps }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i <= step ? theme.brand : theme.backgroundSelected },
                  ]}
                />
              ))}
            </View>
            <View style={{ width: 24 }} />
          </View>

          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}>
              <ThemedText type="title" style={styles.title}>
                {title}
              </ThemedText>
              {subtitle ? (
                <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
                  {subtitle}
                </ThemedText>
              ) : null}
              <View style={styles.fields}>{children}</View>
            </ScrollView>
          </TouchableWithoutFeedback>

          <Pressable
            disabled={continueDisabled}
            onPress={onContinue}
            style={[
              styles.continueButton,
              { backgroundColor: theme.brand },
              continueDisabled && styles.disabled,
            ]}>
            <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
              {continueLabel}
            </ThemedText>
          </Pressable>
        </KeyboardAvoidingView>
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
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 24,
    height: 6,
    borderRadius: Radius.full,
  },
  body: {
    flex: 1,
    marginTop: Spacing.five,
  },
  bodyContent: {
    paddingBottom: Spacing.four,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    marginTop: Spacing.two,
  },
  fields: {
    marginTop: Spacing.five,
    gap: Spacing.three,
  },
  continueButton: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
