// Client-callable functions (parse-receipt, get-or-generate-nudge,
// get-or-generate-reflection) are hit directly by supabase.functions.invoke, which runs
// under real browser CORS rules when the app is loaded via `expo start --web` — unlike
// a native Expo Go session, where fetch() isn't subject to CORS at all. Deno.serve
// doesn't add these headers automatically, so the browser's preflight `OPTIONS`
// request (triggered by the Authorization/Content-Type headers supabase-js attaches)
// gets no Access-Control-Allow-Origin back, gets blocked client-side, and the actual
// POST is never sent — surfacing to the caller as supabase-js's generic
// FunctionsFetchError ("Failed to send a request to the Edge Function"), not as any
// error this function itself produced.
//
// There's no public web deployment of this app (mobile-only distribution; `expo start
// --web` is a local dev tool only), so the only legitimate browser origins are the
// local dev server's own — reflect the request's Origin back only when it matches that
// pattern instead of allowing '*'. Native requests never send an Origin header and
// aren't subject to CORS at all, so this doesn't affect them.
const ALLOWED_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowOrigin = origin && ALLOWED_ORIGIN_PATTERN.test(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }
  return null;
}
