// Dev-tools test function, NOT part of the production cron flow. Client-callable
// (via supabase.functions.invoke, JWT-authenticated like get-or-generate-nudge — the
// user id comes from the verified token, never a client-supplied parameter).
//
// Unlike generate-reflections (the real cron batch, which only ever reflects on the
// last FULLY COMPLETED week/month), this always regenerates against the week/month
// STILL IN PROGRESS, so a tester can log a transaction and immediately see it show up
// without waiting for the real period to close. Repeated calls are expected while
// iterating, but throttled server-side (see cooldownRemainingMs) so this paid-API
// endpoint can't be spammed in a loop.
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { getAuthenticatedUserId } from '../_shared/user-auth.ts';
import { toISODate } from '../_shared/dates.ts';
import { cooldownRemainingMs } from '../_shared/rate-limit.ts';
import {
  generateReflectionForUser,
  inProgressPeriodRangeFor,
  type PeriodType,
  type ReflectionProfileInput,
} from '../_shared/reflection-generation.ts';

const REGENERATE_COOLDOWN_MS = 60_000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  let userId: string | null;
  try {
    userId = await getAuthenticatedUserId(req);
  } catch (error) {
    console.error('get-or-generate-reflection: auth check failed', error);
    return jsonResponse({ error: 'Auth check failed.' }, 500);
  }
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  let periodType: PeriodType;
  try {
    const body = await req.json();
    if (body.periodType !== 'weekly' && body.periodType !== 'monthly') {
      throw new Error('periodType must be "weekly" or "monthly"');
    }
    periodType = body.periodType;
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Invalid request body' }, 400);
  }

  const admin = getAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, name, currency')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    if (profileError) console.error('get-or-generate-reflection: profile lookup failed', profileError);
    return jsonResponse({ error: 'Profile not found.' }, 404);
  }

  const { current, prior } = inProgressPeriodRangeFor(periodType, new Date());
  const periodStart = toISODate(current.start);

  const { data: existing, error: existingError } = await admin
    .from('ai_reflections')
    .select('created_at')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .eq('period_start', periodStart)
    .maybeSingle();

  if (existingError) {
    console.error('get-or-generate-reflection: existing lookup failed', existingError);
    return jsonResponse({ error: 'Could not check for an existing reflection.' }, 500);
  }

  if (existing) {
    const remainingMs = cooldownRemainingMs(existing.created_at, REGENERATE_COOLDOWN_MS, new Date());
    if (remainingMs > 0) {
      return jsonResponse(
        { error: `Please wait ${Math.ceil(remainingMs / 1000)}s before regenerating again.` },
        429
      );
    }
  }

  const result = await generateReflectionForUser(profile as ReflectionProfileInput, periodType, current, prior);

  if (!result.ok) {
    console.error('get-or-generate-reflection: generation failed', result.error);
    return jsonResponse({ error: 'Could not generate a reflection right now.' }, 502);
  }
  if (!result.reflection) {
    return jsonResponse({ error: `No transactions logged yet in the current ${periodType} period.` }, 422);
  }

  return jsonResponse({ reflection: result.reflection });
});
