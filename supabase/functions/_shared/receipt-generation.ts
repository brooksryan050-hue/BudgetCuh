// Shared receipt-photo parsing, used by parse-receipt/index.ts. Sends the photo
// straight to Claude as an image content block (no Storage bucket, nothing
// persisted) and asks it to bucket line items into the caller's own category ids —
// never a freeform category name — so the client never has to fuzzy-match a
// category. A detected non-home currency triggers a Frankfurter FX lookup so the
// client can offer a converted total; a failed/unsupported lookup just omits
// `conversion` rather than failing the whole request.
import { generateStructured } from './anthropic.ts';

export interface ReceiptCategoryInput {
  id: string;
  name: string;
}

export interface ParseReceiptInput {
  imageBase64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  categories: ReceiptCategoryInput[];
  homeCurrency: string;
}

interface ReceiptItem {
  categoryId: string;
  label: string;
  amount: number;
}

interface ReceiptResponse {
  readable: boolean;
  merchant: string | null;
  receiptDate: string | null;
  receiptCurrency: string;
  items: ReceiptItem[];
}

export interface ReceiptConversion {
  rate: number;
  rateDate: string;
  convertedItems: { categoryId: string; label: string; amount: number }[];
}

export interface ParseReceiptResult {
  readable: boolean;
  merchant: string | null;
  receiptDate: string | null;
  receiptCurrency: string;
  homeCurrency: string;
  items: ReceiptItem[];
  conversion: ReceiptConversion | null;
}

const MAX_ITEMS = 8;

function buildSchema(categoryIds: string[]): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      readable: {
        type: 'boolean',
        description: 'false if the photo is not a legible receipt/purchase record — do not guess numbers in that case',
      },
      merchant: { type: ['string', 'null'], description: 'Store/restaurant name as printed on the receipt' },
      receiptDate: { type: ['string', 'null'], description: 'ISO 8601 date (YYYY-MM-DD) if visible on the receipt, else null' },
      receiptCurrency: {
        type: 'string',
        description:
          'Best-guess ISO 4217 currency code for the receipt, inferred from currency symbols, store address/location text, or language. Default to the currency symbol shown if a location cannot be determined.',
      },
      items: {
        type: 'array',
        description: `Bucket every line item into ONE entry per category — do not return one entry per individual product line. Sum amounts within a bucket. A single-category receipt (e.g. a restaurant) should return exactly one item. Return at most ${MAX_ITEMS} items.`,
        items: {
          type: 'object',
          properties: {
            categoryId: { type: 'string', enum: categoryIds },
            label: { type: 'string', description: 'Short human label for this bucket, e.g. "Groceries" or "Clothing"' },
            amount: { type: 'number', description: 'Subtotal for this bucket, in receiptCurrency' },
          },
          required: ['categoryId', 'label', 'amount'],
          additionalProperties: false,
        },
      },
    },
    required: ['readable', 'merchant', 'receiptDate', 'receiptCurrency', 'items'],
    additionalProperties: false,
  };
}

function buildSystemPrompt(categories: ReceiptCategoryInput[]): string {
  const catalog = categories.map((c) => `${c.id} = ${c.name}`).join(', ');
  return `You read photos of purchase receipts for a budgeting app and extract structured spending data. Categories you may use (id = name): ${catalog}. Assign every line item to the closest matching category id from that exact list — never invent a category id. Group items into at most ${MAX_ITEMS} buckets, one per category present on the receipt, summing amounts within each bucket. If the photo isn't a legible receipt, set readable to false and items to an empty array rather than guessing.`;
}

async function fetchConversion(
  from: string,
  to: string,
  items: ReceiptItem[]
): Promise<ReceiptConversion | null> {
  if (from === to) return null;

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`
    );
    if (!response.ok) return null;

    const data = (await response.json()) as { date?: string; rates?: Record<string, number> };
    const rate = data.rates?.[to];
    if (!rate || !data.date) return null;

    return {
      rate,
      rateDate: data.date,
      convertedItems: items.map((item) => ({
        categoryId: item.categoryId,
        label: item.label,
        amount: Math.round(item.amount * rate * 100) / 100,
      })),
    };
  } catch {
    // Network error, unsupported pair, or bad response — conversion is best-effort.
    return null;
  }
}

export async function parseReceipt(
  input: ParseReceiptInput
): Promise<{ ok: true; data: ParseReceiptResult } | { ok: false; reason: string; detail: string }> {
  const categoryIds = input.categories.map((c) => c.id);

  const result = await generateStructured<ReceiptResponse>({
    system: buildSystemPrompt(input.categories),
    userContent: [
      {
        type: 'image',
        source: { type: 'base64', media_type: input.mediaType, data: input.imageBase64 },
      },
      {
        type: 'text',
        text: 'Extract this receipt into the required JSON structure.',
      },
    ],
    jsonSchema: buildSchema(categoryIds),
    maxTokens: 1536,
    effort: 'low',
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason, detail: result.detail };
  }

  const { data } = result;
  if (!data.readable) {
    return {
      ok: true,
      data: {
        readable: false,
        merchant: null,
        receiptDate: null,
        receiptCurrency: input.homeCurrency,
        homeCurrency: input.homeCurrency,
        items: [],
        conversion: null,
      },
    };
  }

  const conversion = await fetchConversion(data.receiptCurrency, input.homeCurrency, data.items);

  return {
    ok: true,
    data: {
      readable: true,
      merchant: data.merchant,
      receiptDate: data.receiptDate,
      receiptCurrency: data.receiptCurrency,
      homeCurrency: input.homeCurrency,
      items: data.items,
      conversion,
    },
  };
}
