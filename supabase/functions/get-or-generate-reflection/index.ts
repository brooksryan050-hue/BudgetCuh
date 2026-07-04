// Dev-tools test function, NOT part of the production cron flow. Client-callable
// (via supabase.functions.invoke, JWT-authenticated like get-or-generate-nudge — the
// user id comes from the verified token, never a client-supplied parameter).
//
// Unlike generate-reflections (the real cron batch, which only ever reflects on the
// last FULLY COMPLETED week/month), this always regenerates against the week/month
// STILL IN PROGRESS, so a tester can log a transaction and immediately see it show up
// without waiting for the real period to close. It always overwrites — repeated calls
// are expected while iterating.
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { getAuthenticatedUserId } from '../_shared/user-auth.ts';
import {
  generateReflectionForUser,
  inProgressPeriodRangeFor,
  type PeriodType,
  type ReflectionProfileInput,
} from '../_shared/reflection-generation.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  let userId: string | null;
  try {
    userId = await getAuthenticatedUserId(req);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Auth check failed' }, 500);
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
    return jsonResponse({ error: profileError?.message ?? 'Profile not found' }, 404);
  }

  const { current, prior } = inProgressPeriodRangeFor(periodType, new Date());
  const result = await generateReflectionForUser(profile as ReflectionProfileInput, periodType, current, prior);

  if (!result.ok) return jsonResponse({ error: result.error }, 502);
  if (!result.reflection) {
    return jsonResponse({ error: `No transactions logged yet in the current ${periodType} period.` }, 422);
  }

  return jsonResponse({ reflection: result.reflection });
});
