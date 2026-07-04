-- Lets a transaction be attributed to a specific account (the user is now asked
-- which account an income/expense affects when they have more than one). Nullable
-- and "on delete set null" rather than cascade: deleting an account shouldn't wipe
-- out the transaction history logged against it, and pre-existing transactions
-- (logged before this column existed) simply have no account_id and fall back to
-- the primary account for balance purposes, same as the client-side type's
-- optional accountId field.
alter table public.transactions
  add column account_id text references public.accounts (id) on delete set null;
