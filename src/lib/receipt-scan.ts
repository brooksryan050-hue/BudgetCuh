import { supabase } from '@/lib/supabase';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import type { ID } from '@/types';

/**
 * Same FunctionsHttpError-unwrapping trick as src/lib/ai-content.ts's
 * functionErrorMessage — supabase.functions.invoke's `error.message` is a generic
 * "non-2xx status code" string, so read the response body's `error` field instead.
 */
async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Response body wasn't JSON (or was already consumed) — fall through.
    }
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

export interface ReceiptItem {
  categoryId: ID;
  label: string;
  amount: number;
}

export interface ReceiptConversion {
  rate: number;
  rateDate: string;
  convertedItems: ReceiptItem[];
}

export interface ParsedReceipt {
  readable: boolean;
  merchant: string | null;
  receiptDate: string | null;
  receiptCurrency: string;
  homeCurrency: string;
  items: ReceiptItem[];
  conversion: ReceiptConversion | null;
}

/**
 * Calls the parse-receipt Edge Function with an already-compressed, base64-encoded
 * receipt photo. Sends the app's fixed expense category catalog (id + name only) so
 * Claude returns a categoryId from that exact closed set — never a freeform guess
 * the client would have to fuzzy-match.
 */
export async function scanReceipt(params: {
  imageBase64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  homeCurrency: string;
}): Promise<ParsedReceipt> {
  const categories = DEFAULT_CATEGORIES.filter((c) => c.kind !== 'income').map(({ id, name }) => ({ id, name }));

  const { data, error } = await supabase.functions.invoke('parse-receipt', {
    body: {
      imageBase64: params.imageBase64,
      mediaType: params.mediaType,
      categories,
      homeCurrency: params.homeCurrency,
    },
  });

  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.receipt) throw new Error('parse-receipt returned no result.');
  return data.receipt as ParsedReceipt;
}
