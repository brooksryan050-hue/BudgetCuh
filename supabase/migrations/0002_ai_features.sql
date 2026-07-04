-- AI coaching nudges + reflection summaries: server-generated content, written only by
-- the generate-nudges / generate-reflections Edge Functions (via their service-role
-- client, which bypasses RLS entirely) and read-only for clients — hence "_select_own"
-- policies only, no insert/update/delete policy for anon/authenticated.
--
-- MANUAL SETUP REQUIRED (do not commit secret values, and these are NOT part of this
-- migration's SQL below):
--   1. Against each target project (local + hosted), create the cron shared secret:
--        select vault.create_secret('<a random value>', 'cron_secret');
--   2. Set the same value as an Edge Function secret:
--        supabase secrets set CRON_SECRET=<the same random value>
--   3. Set the Anthropic API key as an Edge Function secret (never as EXPO_PUBLIC_*):
--        supabase secrets set ANTHROPIC_API_KEY=<your key>
--   4. The cron job URLs below are already pointed at the hosted project
--      (wbbhwcurathqacigjtou.supabase.co). If this migration is ever reused for a
--      different Supabase project, update the project ref in the URLs accordingly.
--      Local dev (`supabase start`) doesn't use these URLs at all — invoke the
--      functions directly via `supabase functions serve` for local testing instead.

create table public.ai_nudges (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  generated_date date not null,
  title text not null,
  message text not null,
  tone text not null check (tone in ('celebratory', 'encouraging', 'concerned', 'neutral')),
  context_snapshot jsonb not null default '{}',
  model text not null default 'claude-sonnet-5',
  created_at timestamptz not null default now()
);
create unique index ai_nudges_user_date_idx on public.ai_nudges (user_id, generated_date);

alter table public.ai_nudges enable row level security;
create policy "ai_nudges_select_own" on public.ai_nudges
  for select using (user_id = auth.uid());

create table public.ai_reflections (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  period_type text not null check (period_type in ('weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  summary text not null,
  highlights text[] not null default '{}',
  category_insight text,
  context_snapshot jsonb not null default '{}',
  model text not null default 'claude-sonnet-5',
  created_at timestamptz not null default now()
);
create unique index ai_reflections_user_period_idx
  on public.ai_reflections (user_id, period_type, period_start);

alter table public.ai_reflections enable row level security;
create policy "ai_reflections_select_own" on public.ai_reflections
  for select using (user_id = auth.uid());

-- Ops/audit log for the scheduled runs. RLS enabled with zero policies defined means
-- no anon/authenticated request can read or write this table via PostgREST at all —
-- only the service-role key (used internally by the Edge Functions) bypasses RLS.
create table public.ai_generation_runs (
  id bigint generated always as identity primary key,
  run_type text not null check (run_type in ('nudges', 'reflections_weekly', 'reflections_monthly')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  users_processed integer not null default 0,
  users_failed integer not null default 0,
  error_summary jsonb
);
alter table public.ai_generation_runs enable row level security;

-- Scheduling: pg_cron fires an HTTP POST (via pg_net) to each Edge Function on a
-- schedule. The functions are deployed with verify_jwt = false (see
-- supabase/config.toml) since these requests carry no Supabase JWT — auth instead
-- comes from the x-cron-secret header, checked as the first line of each function
-- against its own CRON_SECRET env var. The service-role key itself never appears in
-- the cron job body; each function builds its own privileged client internally from
-- the SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars Supabase auto-injects.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'generate-nudges-daily',
  '0 13 * * *', -- 13:00 UTC daily
  $$
  select net.http_post(
    url := 'https://wbbhwcurathqacigjtou.supabase.co/functions/v1/generate-nudges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'generate-reflections-weekly',
  '0 13 * * 1', -- 13:00 UTC every Monday — computes the just-completed Mon-Sun week
  $$
  select net.http_post(
    url := 'https://wbbhwcurathqacigjtou.supabase.co/functions/v1/generate-reflections',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{"periodType": "weekly"}'::jsonb
  );
  $$
);

select cron.schedule(
  'generate-reflections-monthly',
  '5 13 1 * *', -- 13:05 UTC on the 1st of each month — computes the just-completed calendar month
  $$
  select net.http_post(
    url := 'https://wbbhwcurathqacigjtou.supabase.co/functions/v1/generate-reflections',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{"periodType": "monthly"}'::jsonb
  );
  $$
);
