// Derives the calling user's id from their own Supabase session JWT (forwarded by
// supabase.functions.invoke() as the Authorization header) — never trust a
// client-supplied user id directly. Uses the anon key + the caller's own token so
// this only succeeds for a genuinely valid, non-expired session.
import { createClient } from 'npm:@supabase/supabase-js@2';

export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY in the function environment.');
  }

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}
