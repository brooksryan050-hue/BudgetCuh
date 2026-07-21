import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { PaywallLegalFooter } from '@/components/paywall/legal-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrialEligibility } from '@/hooks/use-trial-eligibility';
import {
  describeSubscriptionDuration,
  getCurrentOffering,
  purchasePackageAndCheckEntitlement,
  restorePurchasesAndCheckEntitlement,
} from '@/lib/purchases';

function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const FEATURES = [
  'Unlimited AI receipt scanning',
  'Automatic currency conversion for overseas purchases',
  'Priority support',
  'One subscription, every future perk',
];

export default function PaywallScreen() {
  const theme = useTheme();
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
        router.back();
      }
    } catch (error) {
      const isCancelled = (error as { userCancelled?: boolean })?.userCancelled === true;
      if (!isCancelled) setActionError("Couldn't complete the purchase. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRestore() {
    if (isBusy) return;
    tap();
    setIsBusy(true);
    setActionError(null);
    try {
      const entitled = await restorePurchasesAndCheckEntitlement();
      if (entitled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.back();
      } else {
        setActionError('No active subscription found for this account.');
      }
    } catch {
      setActionError("Couldn't restore purchases. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <ThemedText type="smallBold">BudgetCuh Pro</ThemedText>
          <Pressable
            hitSlop={8}
            style={styles.headerButton}
            onPress={() => {
              tap();
              router.back();
            }}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.featureList}>
            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.brand} />
                <ThemedText type="default" style={styles.featureText}>
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
                const duration = describeSubscriptionDuration(pkg);
                const priceText = trial ? `${trial.label} ${pkg.product.priceString}` : pkg.product.priceString;
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
                      <ThemedText type="smallBold">
                        {duration ? `${pkg.product.title} · ${duration}` : pkg.product.title}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {priceText}
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
                {selectedId && trialByProductId[selectedId] ? 'Start Free Trial' : 'Subscribe'}
              </ThemedText>
            )}
          </Pressable>

          <Pressable style={styles.restoreButton} onPress={handleRestore} disabled={isBusy}>
            <ThemedText type="small" themeColor="textSecondary">
              Restore purchases
            </ThemedText>
          </Pressable>

          <PaywallLegalFooter />
        </View>
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
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.four,
  },
  featureList: {
    gap: Spacing.three,
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
    gap: 2,
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
  restoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
