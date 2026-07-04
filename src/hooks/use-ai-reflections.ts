import { useCallback, useEffect, useState } from 'react';

import { fetchReflections } from '@/lib/ai-content';
import { useAuthStore } from '@/store/auth-store';
import type { AiReflection, ReflectionPeriodType } from '@/types';

/** Same fetch-on-open + pull-to-refresh model as use-ai-nudges.ts — see that file's comment. */
export function useReflections(periodType: ReflectionPeriodType) {
  const session = useAuthStore((s) => s.session);
  const [reflections, setReflections] = useState<AiReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setReflections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchReflections(session.user.id, periodType);
      setReflections(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your reflections.');
    } finally {
      setLoading(false);
    }
  }, [session, periodType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { reflections, loading, error, refresh };
}
