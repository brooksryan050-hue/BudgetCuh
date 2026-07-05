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

/**
 * Just the symbol (e.g. "$", "€", "£"), for spots like the transaction-form amount
 * input that need it standalone rather than embedded in a formatted number. Prefers
 * Intl's own symbol for any real ISO 4217 code (covers currencies beyond our static
 * CURRENCIES catalog), falls back to that catalog, then to the raw code itself for a
 * completely made-up custom code.
 */
export function getCurrencySymbol(currencyCode: string): string {
  const code = (currencyCode || 'USD').toUpperCase();
  if (isValidCurrencyCode(code)) {
    try {
      const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).formatToParts(0);
      const symbolPart = parts.find((part) => part.type === 'currency');
      if (symbolPart) return symbolPart.value;
    } catch {
      // Fall through to the static catalog / raw-code fallback below.
    }
  }
  return getCurrencyByCode(code)?.symbol ?? code;
}
