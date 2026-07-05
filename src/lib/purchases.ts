import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesOffering } from 'react-native-purchases';

/** Must match the entitlement identifier configured in the RevenueCat dashboard. */
export const ENTITLEMENT_ID = 'BudgetCuh Pro';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

let configured = false;

/**
 * Call once at app startup (see _layout.tsx). No-ops on web (react-native-purchases
 * is a native module — there's no Purchases account/paywall on the web build) and if
 * the platform API key hasn't been set yet, so a missing .env value fails soft
 * instead of crashing app boot.
 */
export function configurePurchases(): void {
  if (configured || Platform.OS === 'web') return;
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  if (!apiKey) {
    console.warn('RevenueCat API key missing — purchases disabled for this build.');
    return;
  }
  Purchases.configure({ apiKey });
  configured = true;
}

/**
 * Ties RevenueCat's subscriber record to the Supabase user id instead of an
 * anonymous device id, so entitlement follows the account across devices/reinstalls.
 * Call on sign-in; call `logOutPurchasesUser` on sign-out. Both no-op safely if
 * `configurePurchases` never ran (web, or missing API key).
 */
export async function logInPurchasesUser(userId: string): Promise<void> {
  if (!configured) return;
  await Purchases.logIn(userId);
}

export async function logOutPurchasesUser(): Promise<void> {
  if (!configured) return;
  await Purchases.logOut();
}

export function isEntitled(customerInfo: CustomerInfo): boolean {
  return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackageAndCheckEntitlement(
  pkg: NonNullable<PurchasesOffering['availablePackages']>[number]
): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return isEntitled(customerInfo);
}

export async function restorePurchasesAndCheckEntitlement(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return isEntitled(customerInfo);
}
