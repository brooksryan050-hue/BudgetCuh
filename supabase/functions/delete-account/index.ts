// Client-callable (via supabase.functions.invoke, JWT-authenticated — see
// supabase/config.toml's verify_jwt = true for this function). Permanently deletes
// the caller's own auth.users row via the admin API; every other table
// (profiles, transactions, budgets, accounts, challenge_instances, savings_goals,
// savings_goal_contributions, user_badges, weekly_summaries, ai_nudges,
// ai_reflections, ai_receipt_scans) references user_id/id with `on delete cascade`
// (see migrations/0001_init.sql), so this single call removes all of it — no
// per-table cleanup needed here. Required for App Store Guideline 5.1.1(v): apps
// that support account creation must also support in-app account deletion.
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { getAuthenticatedUserId } from '../_shared/user-auth.ts';
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  let userId: string | null;
  try {
    userId = await getAuthenticatedUserId(req);
  } catch (error) {
    console.error('delete-account: auth check failed', error);
    return jsonResponse({ error: 'Auth check failed.' }, 500);
  }
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  const admin = getAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('delete-account: deleteUser failed', error);
    return jsonResponse({ error: 'Could not delete account.' }, 500);
  }

  return jsonResponse({ deleted: true });
});
