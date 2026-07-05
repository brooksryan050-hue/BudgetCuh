-- Rate-limit log for parse-receipt (the AI receipt-scanner Edge Function). No image
-- data is ever stored — this table exists purely so parse-receipt/index.ts can count
-- a user's scans over a sliding window before allowing another paid Claude vision
-- call. RLS enabled with zero policies, same as ai_generation_runs in
-- 0002_ai_features.sql: service-role only, unreachable via PostgREST for anon/authenticated.

create table public.ai_receipt_scans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index ai_receipt_scans_user_time_idx on public.ai_receipt_scans (user_id, created_at);

alter table public.ai_receipt_scans enable row level security;
