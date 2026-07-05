import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HomeHeroGradient, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <LinearGradient colors={HomeHeroGradient} style={styles.hero}>
        <View style={[styles.heroContent, { paddingTop: insets.top + Spacing.four }]}>
          {/* Decorative sky dressing — soft cloud blobs + sparkle icons, echoing the
              reference screenshot's welcome-screen composition. */}
          <View style={[styles.cloud, styles.cloudOne]} />
          <View style={[styles.cloud, styles.cloudTwo]} />
          <Ionicons name="sparkles" size={16} color="rgba(255,255,255,0.5)" style={styles.sparkleOne} />
          <Ionicons name="sparkles" size={12} color="rgba(255,255,255,0.4)" style={styles.sparkleTwo} />
          <Ionicons name="sparkles" size={20} color="rgba(255,255,255,0.35)" style={styles.sparkleThree} />

          <Image
            source={require('@/assets/images/mascot-robot.png')}
            style={styles.mascotImage}
            contentFit="contain"
          />

          <ThemedText type="title" style={styles.wordmark}>
            BudgetCuh
          </ThemedText>
        </View>
      </LinearGradient>

      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.bottomSafeArea}>
        <View style={styles.contentArea}>
          <ThemedText type="title" style={styles.headline}>
            Meet your money sidekick.
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtext}>
            Track spending, hit your goals, and build better habits — all in one place.
          </ThemedText>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.brand }]}
            onPress={() => router.push('/(auth)/sign-up')}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              Create account
            </ThemedText>
          </Pressable>

          <Pressable hitSlop={8} onPress={() => router.push('/(auth)/sign-in')}>
            <ThemedText type="link" themeColor="textSecondary" style={styles.secondaryLink}>
              I already have an account
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    flex: 1.1,
    width: '100%',
  },
  heroContent: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: Radius.full,
  },
  cloudOne: {
    width: 140,
    height: 44,
    top: '14%',
    left: '8%',
  },
  cloudTwo: {
    width: 100,
    height: 34,
    top: '22%',
    right: '10%',
  },
  sparkleOne: {
    position: 'absolute',
    top: '10%',
    right: '20%',
  },
  sparkleTwo: {
    position: 'absolute',
    top: '30%',
    left: '18%',
  },
  sparkleThree: {
    position: 'absolute',
    bottom: '8%',
    right: '14%',
  },
  mascotImage: {
    width: 210,
    height: 298,
    // The source art's pose (waving arm, torso leaning right of the head) puts its
    // visual center of mass right of the image's geometric center — nudge left so
    // it reads as centered against the wordmark below it.
    transform: [{ translateX: -12 }],
  },
  wordmark: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 34,
  },
  bottomSafeArea: {
    width: '100%',
  },
  contentArea: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  headline: {
    fontSize: 30,
    lineHeight: 36,
  },
  subtext: {
    marginBottom: Spacing.three,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryLink: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
