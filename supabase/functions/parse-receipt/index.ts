// Client-callable (via supabase.functions.invoke, JWT-authenticated — see
// supabase/config.toml's verify_jwt = true for this function). Sends the caller's
// receipt photo straight to Claude for parsing; nothing is persisted server-side
// except a bare rate-limit log row (ai_receipt_scans — no image data, see
// migrations/0003_receipt_scans.sql).
//
// Rate-limited to MAX_SCANS_PER_HOUR per user: unlike get-or-generate-nudge (which
// is naturally throttled by its once-a-day cache), every call here is a fresh paid
// Claude vision request, so there's no cached-content row to key a cooldown off of —
// a simple per-user count over a sliding window instead.
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { getAuthenticatedUserId } from '../_shared/user-auth.ts';
import { parseReceipt, type ReceiptCategoryInput } from '../_shared/receipt-generation.ts';
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts';

const MAX_SCANS_PER_HOUR = 15;
const WINDOW_MS = 60 * 60 * 1000;
// ~3MB decoded, generous over the client's 1600px/q0.7 JPEG output (scan-receipt.tsx) —
// caps cost-per-call for callers that skip the client-side resize/compress step.
const MAX_IMAGE_BASE64_LENGTH = 4_000_000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

interface RequestBody {
  imageBase64?: string;
  mediaType?: string;
  categories?: ReceiptCategoryInput[];
  homeCurrency?: string;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  let userId: string | null;
  try {
    userId = await getAuthenticatedUserId(req);
  } catch (error) {
    console.error('parse-receipt: auth check failed', error);
    return jsonResponse({ error: 'Auth check failed.' }, 500);
  }
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  if (!body.imageBase64 || typeof body.imageBase64 !== 'string') {
    return jsonResponse({ error: 'Missing imageBase64.' }, 400);
  }
  if (body.imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return jsonResponse({ error: 'Image is too large.' }, 413);
  }
  if (body.mediaType !== 'image/jpeg' && body.mediaType !== 'image/png' && body.mediaType !== 'image/webp') {
    return jsonResponse({ error: 'mediaType must be image/jpeg, image/png, or image/webp.' }, 400);
  }
  if (!Array.isArray(body.categories) || body.categories.length === 0) {
    return jsonResponse({ error: 'Missing categories.' }, 400);
  }
  if (!body.homeCurrency || typeof body.homeCurrency !== 'string') {
    return jsonResponse({ error: 'Missing homeCurrency.' }, 400);
  }

  const admin = getAdminClient();
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error: countError } = await admin
    .from('ai_receipt_scans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart);

  if (countError) {
    console.error('parse-receipt: rate-limit check failed', countError);
    return jsonResponse({ error: 'Could not verify rate limit.' }, 500);
  }
  if ((count ?? 0) >= MAX_SCANS_PER_HOUR) {
    return jsonResponse({ error: 'Too many receipt scans this hour. Please try again later.' }, 429);
  }

  const { error: insertError } = await admin.from('ai_receipt_scans').insert({ user_id: userId });
  if (insertError) {
    console.error('parse-receipt: rate-limit log insert failed', insertError);
    return jsonResponse({ error: 'Could not process receipt scan.' }, 500);
  }

  const result = await parseReceipt({
    imageBase64: body.imageBase64,
    mediaType: body.mediaType,
    categories: body.categories,
    homeCurrency: body.homeCurrency,
  });

  if (!result.ok) {
    console.error('parse-receipt: generation failed', result.reason, result.detail);
    return jsonResponse({ error: 'Could not read that receipt right now.' }, 502);
  }

  return jsonResponse({ receipt: result.data });
});
