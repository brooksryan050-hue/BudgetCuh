// Weekly (Mondays) / monthly (1st) cron-triggered function (see
// migrations/0002_ai_features.sql). Invoked with {"periodType": "weekly"|"monthly"}.
// Computes the just-completed period's aggregates via the shared
// generateReflectionForUser (also used by the on-demand dev-tools test function),
// asks Claude for a short narrative reflection, upserted idempotently per period.
import { assertCronSecret } from '../_shared/auth.ts';
import { getAdminClient } from '../_shared/supabase-admin.ts';
import {
  completedPeriodRangeFor,
  generateReflectionForUser,
  type PeriodType,
  type ReflectionProfileInput,
} from '../_shared/reflection-generation.ts';

const PROFILE_PAGE_SIZE = 200;
const CONCURRENCY = 5;
const MAX_LOGGED_ERRORS = 20;

async function processUser(
  profile: ReflectionProfileInput,
  periodType: PeriodType,
  current: { start: Date; end: Date },
  prior: { start: Date; end: Date }
): Promise<{ ok: boolean; error?: string }> {
  const result = await generateReflectionForUser(profile, periodType, current, prior);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

async function processInChunks<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<{ ok: boolean; error?: string }>
) {
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map((item) =>
        fn(item).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }))
      )
    );
    for (const r of results) {
      if (r.ok) {
        succeeded += 1;
      } else {
        failed += 1;
        if (errors.length < MAX_LOGGED_ERRORS && r.error) errors.push(r.error);
      }
    }
  }
  return { succeeded, failed, errors };
}

Deno.serve(async (req) => {
  const unauthorized = assertCronSecret(req);
  if (unauthorized) return unauthorized;

  let periodType: PeriodType;
  try {
    const body = await req.json();
    if (body.periodType !== 'weekly' && body.periodType !== 'monthly') {
      throw new Error('periodType must be "weekly" or "monthly"');
    }
    periodType = body.periodType;
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const admin = getAdminClient();
  const now = new Date();
  const { current, prior } = completedPeriodRangeFor(periodType, now);

  const { data: run } = await admin
    .from('ai_generation_runs')
    .insert({ run_type: periodType === 'weekly' ? 'reflections_weekly' : 'reflections_monthly' })
    .select('id')
    .single();

  let succeeded = 0;
  let failed = 0;
  let page = 0;
  const errors: string[] = [];

  // deno-lint-ignore no-constant-condition
  while (true) {
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, name, currency')
      .range(page * PROFILE_PAGE_SIZE, page * PROFILE_PAGE_SIZE + PROFILE_PAGE_SIZE - 1);

    if (error || !profiles || profiles.length === 0) break;

    const {
      succeeded: s,
      failed: f,
      errors: e,
    } = await processInChunks(profiles as ReflectionProfileInput[], CONCURRENCY, (profile) =>
      processUser(profile, periodType, current, prior)
    );
    succeeded += s;
    failed += f;
    if (errors.length < MAX_LOGGED_ERRORS) errors.push(...e.slice(0, MAX_LOGGED_ERRORS - errors.length));

    if (profiles.length < PROFILE_PAGE_SIZE) break;
    page += 1;
  }

  if (run) {
    await admin
      .from('ai_generation_runs')
      .update({
        finished_at: new Date().toISOString(),
        users_processed: succeeded + failed,
        users_failed: failed,
        error_summary: errors.length > 0 ? { sample: errors } : null,
      })
      .eq('id', run.id);
  }

  return new Response(JSON.stringify({ periodType, processed: succeeded + failed, succeeded, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
