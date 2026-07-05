import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { isEntitled } from '@/lib/purchases';

/**
 * Tracks whether the signed-in account currently holds the premium entitlement.
 * `isLoading` covers the initial getCustomerInfo() round trip on mount — gate any
 * paywall-redirect decision on it the same way (tabs)/_layout.tsx gates the
 * onboarding redirect on the sync pass, so a slow network doesn't bounce a real
 * subscriber to the paywall before their entitlement has had a chance to load.
 * Always reports `{ isPro: false, isLoading: false }` on web, where there's no
 * native Purchases SDK.
 */
export function useEntitlement(): { isPro: boolean; isLoading: boolean } {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;

    Purchases.getCustomerInfo()
      .then((info) => {
        if (!cancelled) setIsPro(isEntitled(info));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const listener = (info: CustomerInfo) => setIsPro(isEntitled(info));
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return { isPro, isLoading };
}
