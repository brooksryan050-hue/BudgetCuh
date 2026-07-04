import { supabase } from '@/lib/supabase';
import type { AiNudge, AiReflection, ReflectionPeriodType } from '@/types';

/**
 * One-directional read layer for the server-generated ai_nudges/ai_reflections
 * tables — these are written only by the generate-nudges/generate-reflections Edge
 * Functions and are deliberately NOT part of sync-engine.ts's bidirectional
 * outbox/pull system (see CLAUDE.md/plan notes: client-mutable vs server-written).
 */

function nudgeFromRow(row: Record<string, unknown>): AiNudge {
  return {
    id: row.id as string,
    generatedDate: row.generated_date as string,
    title: row.title as string,
    message: row.message as string,
    tone: row.tone as AiNudge['tone'],
    createdAt: row.created_at as string,
  };
}

function reflectionFromRow(row: Record<string, unknown>): AiReflection {
  const snapshot = (row.context_snapshot as { totals?: { income?: number; expenses?: number; saved?: number } }) ?? {};
  return {
    id: row.id as string,
    periodType: row.period_type as ReflectionPeriodType,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    summary: row.summary as string,
    highlights: (row.highlights as string[]) ?? [],
    categoryInsight: (row.category_insight as string | null) ?? null,
    totals: {
      income: snapshot.totals?.income ?? 0,
      expenses: snapshot.totals?.expenses ?? 0,
      saved: snapshot.totals?.saved ?? 0,
    },
    createdAt: row.created_at as string,
  };
}

export async function fetchLatestNudge(userId: string): Promise<AiNudge | null> {
  const { data, error } = await supabase
    .from('ai_nudges')
    .select('*')
    .eq('user_id', userId)
    .order('generated_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? nudgeFromRow(data) : null;
}

/**
 * Calls the get-or-generate-nudge Edge Function (supabase.functions.invoke forwards
 * the current session JWT automatically) — fast-path returns today's existing nudge,
 * slow-path generates one live via Claude. Used as an on-open fallback so the Coach
 * screen always has something for today instead of waiting on the daily cron.
 * `force: true` (Profile > Developer options test button) skips the fast path and
 * always regenerates, overwriting today's nudge.
 */
export async function getOrGenerateTodaysNudge(options: { force?: boolean } = {}): Promise<AiNudge> {
  const { data, error } = await supabase.functions.invoke('get-or-generate-nudge', {
    body: { force: options.force ?? false },
  });
  if (error) throw error;
  if (!data?.nudge) throw new Error('get-or-generate-nudge returned no nudge.');
  return nudgeFromRow(data.nudge);
}

/**
 * Dev-tools test helper (Profile > Developer options) — generates a reflection for
 * the week/month STILL IN PROGRESS (unlike the real cron, which only ever reflects on
 * a fully completed period), so a tester can log a transaction and see it immediately.
 * Doesn't return the content directly; the row lands in ai_reflections and the
 * Reflection screen's normal fetch picks it up.
 */
export async function testGenerateReflection(periodType: ReflectionPeriodType): Promise<void> {
  const { error } = await supabase.functions.invoke('get-or-generate-reflection', {
    body: { periodType },
  });
  if (error) throw error;
}

export async function fetchRecentNudges(userId: string, limit = 7): Promise<AiNudge[]> {
  const { data, error } = await supabase
    .from('ai_nudges')
    .select('*')
    .eq('user_id', userId)
    .order('generated_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(nudgeFromRow);
}

export async function fetchReflections(
  userId: string,
  periodType: ReflectionPeriodType,
  limit = 12
): Promise<AiReflection[]> {
  const { data, error } = await supabase
    .from('ai_reflections')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .order('period_start', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(reflectionFromRow);
}
