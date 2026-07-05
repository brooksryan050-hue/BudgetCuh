// Per-user cooldown check for the client-callable on-demand AI functions
// (get-or-generate-nudge, get-or-generate-reflection). Both call Claude, a paid
// per-request API, and both have a client-side `force`/always-regenerate path that
// bypasses the normal once-a-day cache — without this, a signed-in user (or anyone
// replaying the functions.invoke call with their own valid JWT) can spam either
// endpoint in a loop with no server-side backoff. Keyed off the existing row's own
// `created_at` rather than a separate table, since both functions already fetch
// that row to decide whether to serve it from cache.
export function cooldownRemainingMs(lastGeneratedAt: string | null | undefined, cooldownMs: number, now: Date): number {
  if (!lastGeneratedAt) return 0;
  const elapsed = now.getTime() - new Date(lastGeneratedAt).getTime();
  return Math.max(0, cooldownMs - elapsed);
}
