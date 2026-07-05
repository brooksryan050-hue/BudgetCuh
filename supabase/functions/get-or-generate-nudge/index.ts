// Client-callable (via supabase.functions.invoke, which forwards the caller's own
// session JWT). Unlike generate-nudges/generate-reflections, this authenticates via
// the user's own Supabase JWT, not a cron secret — verify_jwt = true (see
// supabase/config.toml), and the user id is derived from the verified token itself,
// never from a client-supplied parameter.
//
// Fast path: if ai_nudges already has today's row for this user, return it with no
// Claude call. Slow path: generate one via the same generateNudgeForUser used by the
// daily batch. No push is sent from here — the user is already looking at the app.
//
// Optional body `{"force": true}` skips the fast path and always regenerates —
// used by the Profile > Developer options "Regenerate today's nudge" test button so
// testers aren't stuck with the first nudge generated each day. `force` is throttled
// server-side (see cooldownRemainingMs) so it can't be used to spam paid Claude calls.
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { getAuthenticatedUserId } from '../_shared/user-auth.ts';
import { generateNudgeForUser, type NudgeProfileInput } from '../_shared/nudge-generation.ts';
import { toISODate } from '../_shared/dates.ts';
import { cooldownRemainingMs } from '../_shared/rate-limit.ts';

const FORCE_REGENERATE_COOLDOWN_MS = 60_000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function readForceFlag(req: Request): Promise<boolean> {
  try {
    const body = await req.json();
    return body?.force === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  let userId: string | null;
  try {
    userId = await getAuthenticatedUserId(req);
  } catch (error) {
    console.error('get-or-generate-nudge: auth check failed', error);
    return jsonResponse({ error: 'Auth check failed.' }, 500);
  }
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  const force = await readForceFlag(req);
  const admin = getAdminClient();
  const today = toISODate(new Date());

  const { data: existing, error: existingError } = await admin
    .from('ai_nudges')
    .select('id, generated_date, title, message, tone, created_at')
    .eq('user_id', userId)
    .eq('generated_date', today)
    .maybeSingle();

  if (existingError) {
    console.error('get-or-generate-nudge: existing lookup failed', existingError);
    return jsonResponse({ error: 'Could not check for an existing nudge.' }, 500);
  }

  if (existing && !force) return jsonResponse({ nudge: existing });

  if (existing && force) {
    const remainingMs = cooldownRemainingMs(existing.created_at, FORCE_REGENERATE_COOLDOWN_MS, new Date());
    if (remainingMs > 0) {
      return jsonResponse(
        { error: `Please wait ${Math.ceil(remainingMs / 1000)}s before regenerating again.` },
        429
      );
    }
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, name, currency, monthly_income, points, created_at')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    if (profileError) console.error('get-or-generate-nudge: profile lookup failed', profileError);
    return jsonResponse({ error: 'Profile not found.' }, 404);
  }

  const result = await generateNudgeForUser(profile as NudgeProfileInput, new Date());
  if (!result.ok) {
    console.error('get-or-generate-nudge: generation failed', result.error);
    return jsonResponse({ error: 'Could not generate a nudge right now.' }, 502);
  }

  return jsonResponse({
    nudge: {
      id: result.nudge.id,
      generated_date: result.nudge.generated_date,
      title: result.nudge.title,
      message: result.nudge.message,
      tone: result.nudge.tone,
      created_at: new Date().toISOString(),
    },
  });
});
