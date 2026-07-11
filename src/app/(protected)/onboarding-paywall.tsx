import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { OnboardingProgressDots } from '@/components/onboarding/onboarding-progress-dots';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HomeHeroGradient, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrialEligibility } from '@/hooks/use-trial-eligibility';
import { getCurrentOffering, purchasePackageAndCheckEntitlement } from '@/lib/purchases';

function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const FEATURES = [
  'Unlimited AI receipt scanning',
  'Automatic currency conversion for overseas purchases',
  'Priority support',
  'One subscription, every future perk',
];

const mascotVideoSource = require('@/assets/videos/mascot-cash-toss.mp4');

/**
 * Alpha mask, not a color overlay: opaque through the middle, fading toward the
 * edges. Used to let the real hero gradient behind the video show through at the
 * edges instead of the video's own flat background, which can't be color-matched
 * reliably since it's a fixed gradient baked into the source clip.
 *
 * The source clip has action (mascot's hands, flying cash) that reaches close to
 * every edge of the frame, so there's no margin available for a fade to complete
 * in without touching *something* — tightening this to fully eliminate any visible
 * edge starts clipping bills/limbs mid-loop. r="48%" is the deliberate compromise:
 * a soft, mostly-hidden edge rather than any visible cropping of the animation.
 */
function RadialFadeMask() {
  return (
    <Svg height="100%" width="100%">
      <Defs>
        <RadialGradient id="fade" cx="50%" cy="50%" r="48%">
          <Stop offset="0%" stopColor="white" stopOpacity="1" />
          <Stop offset="70%" stopColor="white" stopOpacity="1" />
          <Stop offset="100%" stopColor="white" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#fade)" />
    </Svg>
  );
}

export default function OnboardingPaywallScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mascotPlayer = useVideoPlayer(mascotVideoSource, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const trialByProductId = useTrialEligibility(offering);

  useEffect(() => {
    getCurrentOffering()
      .then((result) => {
        setOffering(result);
        const available = result?.availablePackages ?? [];
        setPackages(available);
        setSelectedId(result?.annual?.identifier ?? available[0]?.identifier ?? null);
      })
      .catch(() => setLoadError("Couldn't load subscription options. Check your connection and try again."));
  }, []);

  function handleSkip() {
    tap();
    router.replace('/(tabs)');
  }

  async function handleSubscribe() {
    const selected = packages?.find((p) => p.identifier === selectedId);
    if (!selected || isBusy) return;
    tap();
    setIsBusy(true);
    setActionError(null);
    try {
      const entitled = await purchasePackageAndCheckEntitlement(selected);
      if (entitled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace('/(tabs)');
      }
    } catch (error) {
      const isCancelled = (error as { userCancelled?: boolean })?.userCancelled === true;
      if (!isCancelled) setActionError("Couldn't complete the purchase. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  const selectedTrial = selectedId ? trialByProductId[selectedId] : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <LinearGradient colors={HomeHeroGradient} style={styles.hero}>
          <View style={[styles.headerRow, { paddingTop: insets.top }]}>
            <View style={styles.headerSpacer} />
            <OnboardingProgressDots
              step={4}
              totalSteps={5}
              activeColor="#ffffff"
              inactiveColor="rgba(255,255,255,0.3)"
            />
            <Pressable hitSlop={8} style={styles.skipButton} onPress={handleSkip}>
              <ThemedText type="smallBold" style={styles.skipText}>
                Skip
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.heroContent}>
            <MaskedView style={styles.mascotWrapper} maskElement={<RadialFadeMask />}>
              <VideoView
                player={mascotPlayer}
                style={styles.mascotVideo}
                contentFit="cover"
                nativeControls={false}
                allowsFullscreen={false}
                allowsPictureInPicture={false}
              />
            </MaskedView>
            <ThemedText type="title" style={styles.headline}>
              One more thing before you dive in
            </ThemedText>
            <ThemedText type="default" style={styles.subheadline}>
              Go Pro for unlimited AI receipt scanning, priority support, and every future perk.
            </ThemedText>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.featureList}>
            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                <ThemedText type="small" style={styles.featureText}>
                  {feature}
                </ThemedText>
              </View>
            ))}
          </View>

          {loadError ? (
            <ThemedText type="small" themeColor="danger" style={styles.centerText}>
              {loadError}
            </ThemedText>
          ) : packages === null ? (
            <ActivityIndicator size="large" color={theme.brand} style={styles.spinner} />
          ) : (
            <View style={styles.packageList}>
              {packages.map((pkg) => {
                const selected = pkg.identifier === selectedId;
                const trial = trialByProductId[pkg.identifier];
                return (
                  <Pressable
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      { backgroundColor: theme.backgroundElement },
                      selected && { borderColor: theme.brand },
                    ]}
                    onPress={() => {
                      tap();
                      setSelectedId(pkg.identifier);
                    }}>
                    <View style={styles.packageInfo}>
                      <ThemedText type="smallBold">{pkg.product.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {trial ? `${trial.label} ${pkg.product.priceString}` : pkg.product.priceString}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={selected ? theme.brand : theme.textSecondary}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView
        edges={['bottom', 'left', 'right']}
        style={[styles.bottomSafeArea, { borderTopColor: theme.border }]}>
        <View style={styles.footer}>
          {actionError ? (
            <ThemedText type="small" themeColor="danger" style={styles.centerText}>
              {actionError}
            </ThemedText>
          ) : null}

          <Pressable
            style={[styles.subscribeButton, { backgroundColor: theme.brand }, (isBusy || !selectedId) && styles.disabled]}
            disabled={isBusy || !selectedId}
            onPress={handleSubscribe}>
            {isBusy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                {selectedTrial ? 'Start Free Trial' : 'Subscribe'}
              </ThemedText>
            )}
          </Pressable>

          <Pressable style={styles.laterButton} onPress={handleSkip} disabled={isBusy}>
            <ThemedText type="small" themeColor="textSecondary">
              Maybe later
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
  },
  headerSpacer: {
    width: 44,
  },
  skipButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  skipText: {
    color: '#ffffff',
  },
  heroContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  mascotWrapper: {
    width: 260,
    height: 260,
  },
  mascotVideo: {
    width: '100%',
    height: '100%',
  },
  headline: {
    color: '#ffffff',
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  subheadline: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  bottomSafeArea: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  featureList: {
    gap: Spacing.two,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  featureText: {
    flex: 1,
  },
  spinner: {
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  packageList: {
    gap: Spacing.two,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageInfo: {
    flex: 1,
    gap: 2,
    marginRight: Spacing.two,
  },
  subscribeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    minHeight: 50,
  },
  disabled: {
    opacity: 0.5,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
