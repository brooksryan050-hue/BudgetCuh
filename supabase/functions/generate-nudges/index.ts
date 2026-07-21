// Daily cron-triggered function (see migrations/0002_ai_features.sql for the
// pg_cron schedule). For every user, generates today's nudge via the shared
// generateNudgeForUser (also used by the on-demand get-or-generate-nudge function),
// then — if the user has opted into push — sends it as a real Expo push notification.
// This is the only place pushes are sent: the on-demand path is for a user already
// looking at the app, where a push would be redundant.
import { assertCronSecret } from '../_shared/auth.ts';
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { generateNudgeForUser, type NudgeProfileInput } from '../_shared/nudge-generation.ts';
import { sendExpoPush } from '../_shared/expo-push.ts';
import { getDailyGenerationCap } from '../_shared/daily-budget.ts';

const PROFILE_PAGE_SIZE = 200;
const CONCURRENCY = 5;
const MAX_LOGGED_ERRORS = 20;

interface ProfileRow extends NudgeProfileInput {
  push_notifications_enabled: boolean;
  expo_push_token: string | null;
}

async function processUser(profile: ProfileRow, referenceDate: Date): Promise<{ ok: boolean; error?: string }> {
  const result = await generateNudgeForUser(profile, referenceDate);
  if (!result.ok) return { ok: false, error: result.error };

  if (profile.push_notifications_enabled && profile.expo_push_token) {
    try {
      const ticket = await sendExpoPush(profile.expo_push_token, result.nudge.title, result.nudge.message, {
        type: 'nudge',
      });
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        const admin = getAdminClient();
        await admin.from('profiles').update({ expo_push_token: null }).eq('id', profile.id);
      }
    } catch {
      // A failed push is not a failed nudge generation — the nudge already landed
      // in ai_nudges and will show up in-app regardless of push delivery.
    }
  }

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

  const admin = getAdminClient();
  const referenceDate = new Date();

  const { data: run } = await admin
    .from('ai_generation_runs')
    .insert({ run_type: 'nudges' })
    .select('id')
    .single();

  let succeeded = 0;
  let failed = 0;
  let page = 0;
  let capped = false;
  const errors: string[] = [];
  const dailyCap = getDailyGenerationCap('MAX_DAILY_NUDGE_GENERATIONS');

  // deno-lint-ignore no-constant-condition
  while (true) {
    if (succeeded + failed >= dailyCap) {
      capped = true;
      break;
    }

    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, name, currency, monthly_income, points, created_at, push_notifications_enabled, expo_push_token')
      .range(page * PROFILE_PAGE_SIZE, page * PROFILE_PAGE_SIZE + PROFILE_PAGE_SIZE - 1);

    if (error || !profiles || profiles.length === 0) break;

    const remaining = dailyCap - (succeeded + failed);
    const batch = profiles.slice(0, remaining) as ProfileRow[];

    const {
      succeeded: s,
      failed: f,
      errors: e,
    } = await processInChunks(batch, CONCURRENCY, (profile) => processUser(profile, referenceDate));
    succeeded += s;
    failed += f;
    if (errors.length < MAX_LOGGED_ERRORS) errors.push(...e.slice(0, MAX_LOGGED_ERRORS - errors.length));

    if (batch.length < profiles.length) {
      capped = true;
      break;
    }
    if (profiles.length < PROFILE_PAGE_SIZE) break;
    page += 1;
  }

  if (capped) {
    console.warn(`generate-nudges: hit daily cap of ${dailyCap}, stopping early`);
  }

  if (run) {
    const errorSummary: Record<string, unknown> = {};
    if (errors.length > 0) errorSummary.sample = errors;
    if (capped) errorSummary.capped = true;

    await admin
      .from('ai_generation_runs')
      .update({
        finished_at: new Date().toISOString(),
        users_processed: succeeded + failed,
        users_failed: failed,
        error_summary: Object.keys(errorSummary).length > 0 ? errorSummary : null,
      })
      .eq('id', run.id);
  }

  return new Response(JSON.stringify({ processed: succeeded + failed, succeeded, failed, capped }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
