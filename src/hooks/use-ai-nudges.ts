import { useCallback, useEffect, useState } from 'react';

import { fetchLatestNudge, fetchRecentNudges, getOrGenerateTodaysNudge } from '@/lib/ai-content';
import { useAuthStore } from '@/store/auth-store';
import type { AiNudge } from '@/types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface UseLatestNudgeOptions {
  /**
   * When true, and the fetched nudge is missing or stale for today, calls the
   * get-or-generate-nudge Edge Function to fill it in live. Only the Coach screen
   * (src/app/coach.tsx) opts into this — the Home teaser (ai-features-section.tsx)
   * stays passive-read-only so opening Home never triggers a duplicate Claude call.
   */
  fillInIfMissing?: boolean;
}

/**
 * Fetches on mount / when the session changes — deliberately independent of
 * use-sync-bootstrap.ts (nudges change at most once a day, so fetch-on-open plus
 * pull-to-refresh is enough; there's no value in re-fetching on every app foreground).
 */
export function useLatestNudge(options: UseLatestNudgeOptions = {}) {
  const { fillInIfMissing = false } = options;
  const session = useAuthStore((s) => s.session);
  const [nudge, setNudge] = useState<AiNudge | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setNudge(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchLatestNudge(session.user.id);
      setError(null);

      if (fillInIfMissing && (!result || result.generatedDate !== todayISO())) {
        setNudge(result);
        setLoading(false);
        setGenerating(true);
        try {
          const generated = await getOrGenerateTodaysNudge();
          setNudge(generated);
        } catch (err) {
          // Fall back to whatever we already had (yesterday's nudge, or nothing) —
          // a failed live generation shouldn't wipe out existing content.
          setError(err instanceof Error ? err.message : 'Failed to generate today’s tip.');
        } finally {
          setGenerating(false);
        }
        return;
      }

      setNudge(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your coaching tip.');
    } finally {
      setLoading(false);
    }
  }, [session, fillInIfMissing]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { nudge, loading, generating, error, refresh };
}

export function useRecentNudges(limit = 7) {
  const session = useAuthStore((s) => s.session);
  const [nudges, setNudges] = useState<AiNudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setNudges([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchRecentNudges(session.user.id, limit);
      setNudges(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your coaching history.');
    } finally {
      setLoading(false);
    }
  }, [session, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { nudges, loading, error, refresh };
}
