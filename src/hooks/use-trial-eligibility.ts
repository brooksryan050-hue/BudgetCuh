import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { type PurchasesOffering } from 'react-native-purchases';

export type TrialInfo = { label: string } | null;

/**
 * `checkTrialOrIntroductoryPriceEligibility` is iOS-only — on Android (and web,
 * where there's no native Purchases SDK at all) this always resolves to an empty
 * map, so every package silently falls back to plain pricing.
 *
 * Returns a map of productId -> trial copy (e.g. "7 days free, then") for packages
 * that both have an `introPrice` and are confirmed eligible for this subscriber.
 * Until a free-trial introductory offer is configured in App Store Connect,
 * `introPrice` is null for every product, so this map stays empty and every
 * screen using it renders today's plain pricing unchanged.
 */
export function useTrialEligibility(offering: PurchasesOffering | null): Record<string, TrialInfo> {
  const [trialByProductId, setTrialByProductId] = useState<Record<string, TrialInfo>>({});

  useEffect(() => {
    if (Platform.OS !== 'ios' || !offering) return;

    const packages = offering.availablePackages;
    const productIds = packages.map((pkg) => pkg.product.identifier);
    if (productIds.length === 0) return;

    let cancelled = false;

    Purchases.checkTrialOrIntroductoryPriceEligibility(productIds)
      .then((eligibility) => {
        if (cancelled) return;
        const next: Record<string, TrialInfo> = {};
        for (const pkg of packages) {
          const productId = pkg.product.identifier;
          const introPrice = pkg.product.introPrice;
          const isEligible =
            eligibility[productId]?.status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
          if (introPrice && isEligible) {
            next[productId] = { label: describeTrial(introPrice.periodNumberOfUnits, introPrice.periodUnit) };
          }
        }
        setTrialByProductId(next);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [offering]);

  return trialByProductId;
}

function describeTrial(count: number, unit: string): string {
  // Adjectival form stays singular even when count > 1, e.g. "7-day free trial".
  const unitLabel = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' }[unit] ?? unit.toLowerCase();
  return `${count}-${unitLabel} free trial, then`;
}
