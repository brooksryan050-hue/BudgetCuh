-- Two additions to the AI coaching feature:
--   1. Push notification support: a per-user Expo push token + opt-in toggle,
--      stored on profiles (one token per user — a second device just overwrites
--      the first; acceptable for this app's scale). These sync through the
--      existing client-authenticated updateProfile -> profiles_own RLS path,
--      no new policy needed.
--   2. On-demand nudge generation (get-or-generate-nudge Edge Function) reuses
--      ai_nudges/ai_generation_runs as-is — no schema change needed for that part.

alter table public.profiles
  add column expo_push_token text,
  add column push_notifications_enabled boolean not null default false;
