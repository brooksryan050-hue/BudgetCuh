-- BudgetCuh initial schema: one table per synced entity from src/store/budget-store.ts.
--
-- Not synced (stay client-side only, same as the static ChallengeTemplate/BADGE_CATALOG
-- catalogs already do today):
--   - categories: 100% DEFAULT_CATEGORIES today, no per-user customization exists.
--   - notificationCards: ephemeral, regenerated client-side by use-notification-cards.ts.
--
-- All primary keys are `text`, matching the app's existing client-generated string IDs
-- (e.g. `txn-<timestamp>-<rand>`) — the client keeps generating IDs offline with no
-- collision/remap step needed on first sync.
--
-- Every synced mutable table carries a `deleted_at` soft-delete tombstone: a pull can't
-- otherwise distinguish "never existed" from "deleted on another device". Local delete*
-- actions still remove the row from local state immediately; only the remote side becomes
-- an UPDATE ... SET deleted_at = now().

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  currency text not null,
  monthly_income numeric not null default 0,
  financial_goal_type text not null,
  savings_goal_amount numeric not null default 0,
  savings_goal_cadence text not null,
  selected_category_ids text[] not null default '{}',
  daily_reminder_enabled boolean not null default false,
  daily_reminder_hour smallint not null default 18,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category_id text not null,
  date date not null,
  notes text,
  payment_method text not null,
  is_recurring boolean not null default false,
  recurring_interval text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create index transactions_user_date_idx on public.transactions (user_id, date);

create table public.budgets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id text not null,
  monthly_limit numeric not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create unique index budgets_user_category_active_idx
  on public.budgets (user_id, category_id) where deleted_at is null;

create table public.accounts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  currency text not null,
  balance numeric not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table public.challenge_instances (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text not null,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('active', 'completed', 'failed', 'expired')),
  check_ins date[] not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table public.savings_goals (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null,
  target_amount numeric not null,
  current_amount numeric not null default 0,
  deadline date,
  financial_goal_type text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table public.savings_goal_contributions (
  id text primary key,
  goal_id text not null references public.savings_goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric not null,
  date date not null,
  created_at timestamptz not null default now()
);

create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null,
  primary key (user_id, badge_key)
);

create table public.weekly_summaries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start_date date not null,
  week_end_date date not null,
  total_income numeric not null,
  total_expenses numeric not null,
  total_saved numeric not null,
  money_health_score numeric not null,
  top_category_id text,
  insight_messages text[] not null default '{}',
  generated_at timestamptz not null
);
create unique index weekly_summaries_user_week_idx on public.weekly_summaries (user_id, week_start_date);

-- Row Level Security: every table scoped to auth.uid() so one user can never
-- read or write another user's rows.

alter table public.profiles enable row level security;
create policy "profiles_own" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

alter table public.transactions enable row level security;
create policy "transactions_own" on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.budgets enable row level security;
create policy "budgets_own" on public.budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.accounts enable row level security;
create policy "accounts_own" on public.accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.challenge_instances enable row level security;
create policy "challenge_instances_own" on public.challenge_instances
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.savings_goals enable row level security;
create policy "savings_goals_own" on public.savings_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.savings_goal_contributions enable row level security;
create policy "savings_goal_contributions_own" on public.savings_goal_contributions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.user_badges enable row level security;
create policy "user_badges_own" on public.user_badges
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.weekly_summaries enable row level security;
create policy "weekly_summaries_own" on public.weekly_summaries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
