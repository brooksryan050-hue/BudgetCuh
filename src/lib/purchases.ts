import { Platform } from 'react-native';
import Purchases, {
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

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

const PACKAGE_TYPE_DURATIONS: Partial<Record<PACKAGE_TYPE, string>> = {
  [PACKAGE_TYPE.ANNUAL]: '1 year',
  [PACKAGE_TYPE.SIX_MONTH]: '6 months',
  [PACKAGE_TYPE.THREE_MONTH]: '3 months',
  [PACKAGE_TYPE.TWO_MONTH]: '2 months',
  [PACKAGE_TYPE.MONTHLY]: '1 month',
  [PACKAGE_TYPE.WEEKLY]: '1 week',
  [PACKAGE_TYPE.LIFETIME]: 'Lifetime',
};

/** Fallback for CUSTOM/UNKNOWN package types: parses the store product's ISO 8601 period (e.g. "P1Y", "P3M"). */
function describeIsoPeriod(period: string): string | null {
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(period);
  if (!match) return null;
  const [, years, months, weeks, days] = match;
  if (years) return `${years} year${years === '1' ? '' : 's'}`;
  if (months) return `${months} month${months === '1' ? '' : 's'}`;
  if (weeks) return `${weeks} week${weeks === '1' ? '' : 's'}`;
  if (days) return `${days} day${days === '1' ? '' : 's'}`;
  return null;
}

/** Apple requires subscription length to be shown in the purchase flow (Guideline 3.1.2). */
export function describeSubscriptionDuration(pkg: PurchasesPackage): string | null {
  const label = PACKAGE_TYPE_DURATIONS[pkg.packageType];
  if (label) return label;
  const period = pkg.product.subscriptionPeriod;
  return period ? describeIsoPeriod(period) : null;
}
