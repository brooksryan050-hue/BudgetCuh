// Service-role client factory — bypasses RLS entirely. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are auto-injected into every Edge Function's runtime
// environment by Supabase; no `secrets set` is needed for these two specifically.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

let client: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (client) return client;

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the function environment.');
  }

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
