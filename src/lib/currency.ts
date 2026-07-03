import { getCurrencyByCode } from '@/data/currencies';

export interface CurrencyFormatter {
  format(amount: number): string;
}

const validityCache = new Map<string, boolean>();

function isValidCurrencyCode(code: string): boolean {
  const cached = validityCache.get(code);
  if (cached !== undefined) return cached;
  let valid = true;
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code });
  } catch {
    valid = false;
  }
  validityCache.set(code, valid);
  return valid;
}

function formatFallback(amount: number, code: string, maximumFractionDigits: number): string {
  const symbol = getCurrencyByCode(code)?.symbol ?? `${code} `;
  const rounded = Math.abs(amount).toFixed(maximumFractionDigits);
  const [whole, fraction] = rounded.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const value = fraction ? `${withCommas}.${fraction}` : withCommas;
  return `${amount < 0 ? '-' : ''}${symbol}${value}`;
}

/**
 * Some engines (Hermes on native) throw a RangeError for currency codes their
 * ICU data doesn't recognize — including any custom code a user types in via
 * the currency picker, which isn't validated against real ISO 4217. Falls
 * back to manual symbol + number formatting instead of crashing the screen.
 */
export function getCurrencyFormatter(currencyCode: string, maximumFractionDigits = 2): CurrencyFormatter {
  const code = (currencyCode || 'USD').toUpperCase();
  if (isValidCurrencyCode(code)) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits });
  }
  return { format: (amount: number) => formatFallback(amount, code, maximumFractionDigits) };
}
