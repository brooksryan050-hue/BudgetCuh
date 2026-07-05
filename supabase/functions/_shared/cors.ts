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
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  return null;
}
