// Weekly (Mondays) / monthly (1st) cron-triggered function (see
// migrations/0002_ai_features.sql). Invoked with {"periodType": "weekly"|"monthly"}.
// Computes the just-completed period's aggregates directly from transactions/budgets
// (does NOT depend on weekly_summaries/closeOutWeek, which are dead client-side) and
// asks Claude for a short narrative reflection, upserted idempotently per period.
import { assertCronSecret } from '../_shared/auth.ts';
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { generateStructured } from '../_shared/anthropic.ts';
import { addDays, getMonthRange, getWeekRange, toISODate, type DateRange } from '../_shared/dates.ts';
import { categoryName, DISCRETIONARY_CATEGORY_IDS, RECURRING_CATEGORY_IDS } from '../_shared/categories.ts';

const PROFILE_PAGE_SIZE = 200;
const CONCURRENCY = 5;

type PeriodType = 'weekly' | 'monthly';

interface ReflectionResponse {
  summary: string;
  highlights: string[];
  categoryInsight: string;
}

const REFLECTION_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '2-4 sentence narrative overview of the period' },
    highlights: {
      type: 'array',
      items: { type: 'string' },
      description: '2-4 short highlight strings',
    },
    categoryInsight: { type: 'string', description: '1-2 sentences on a specific category spending pattern' },
  },
  required: ['summary', 'highlights', 'categoryInsight'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You write short narrative financial reflections for BudgetCuh users, in the voice of a supportive, observant friend — not a spreadsheet. Given one user's spending data for a completed week or month, write a 2-4 sentence overview, 2-4 short highlight strings, and one sentence focused on a specific category pattern (e.g., a weekend spending spike). Use only the numbers and category names given — do not invent figures. Prefer concrete comparisons (this week vs last, weekday vs weekend) over generic encouragement.`;

interface TransactionRow {
  category_id: string;
  amount: number;
  type: string;
  date: string;
}

interface BudgetRow {
  category_id: string;
  monthly_limit: number;
}

interface ProfileRow {
  id: string;
  name: string;
  currency: string;
}

function periodRangeFor(periodType: PeriodType, now: Date): { current: DateRange; prior: DateRange } {
  if (periodType === 'weekly') {
    const current = getWeekRange(addDays(now, -7));
    const prior = getWeekRange(addDays(current.start, -7));
    return { current, prior };
  }
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const current = getMonthRange(previousMonthDate);
  const priorMonthDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const prior = getMonthRange(priorMonthDate);
  return { current, prior };
}

function inRange(dateISO: string, range: DateRange): boolean {
  return dateISO >= toISODate(range.start) && dateISO <= toISODate(range.end);
}

function isWeekend(dateISO: string): boolean {
  const [year, month, day] = dateISO.split('-').map(Number);
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}

function buildContext(
  transactions: TransactionRow[],
  budgets: BudgetRow[],
  current: DateRange,
  prior: DateRange,
  currency: string,
  periodType: PeriodType
) {
  const currentTx = transactions.filter((t) => inRange(t.date, current));
  const priorTx = transactions.filter((t) => inRange(t.date, prior));

  const income = currentTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = currentTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const priorExpenses = priorTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const byCategory: Record<string, number> = {};
  const weekendByCategory: Record<string, number> = {};
  for (const t of currentTx) {
    if (t.type !== 'expense') continue;
    byCategory[t.category_id] = (byCategory[t.category_id] ?? 0) + t.amount;
    if (isWeekend(t.date)) {
      weekendByCategory[t.category_id] = (weekendByCategory[t.category_id] ?? 0) + t.amount;
    }
  }

  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([categoryId, amount]) => {
      const weekendAmount = weekendByCategory[categoryId] ?? 0;
      const entry: Record<string, unknown> = {
        categoryName: categoryName(categoryId),
        amount: Math.round(amount),
      };
      if (RECURRING_CATEGORY_IDS.includes(categoryId)) {
        entry.consistent = true;
      }
      if (DISCRETIONARY_CATEGORY_IDS.includes(categoryId) && amount > 0) {
        entry.weekendShare = Math.round((weekendAmount / amount) * 100) / 100;
      }
      return entry;
    });

  const monthTotals: Record<string, number> = {};
  for (const t of currentTx) {
    if (t.type !== 'expense') continue;
    monthTotals[t.category_id] = (monthTotals[t.category_id] ?? 0) + t.amount;
  }
  const budgetsNearOrOverLimit = budgets
    .filter((b) => b.monthly_limit > 0)
    .map((b) => ({
      categoryName: categoryName(b.category_id),
      pctUsed: Math.round(((monthTotals[b.category_id] ?? 0) / b.monthly_limit) * 100),
    }))
    .filter((b) => b.pctUsed >= 85);

  const expensesPctChange =
    priorExpenses > 0 ? Math.round(((expenses - priorExpenses) / priorExpenses) * 100) : null;

  return {
    periodType,
    periodLabel: `${toISODate(current.start)} to ${toISODate(current.end)}`,
    currency,
    totals: {
      income: Math.round(income),
      expenses: Math.round(expenses),
      saved: Math.round(income - expenses),
    },
    topCategories,
    budgetsNearOrOverLimit,
    comparedToPriorPeriod: expensesPctChange === null ? null : { expensesPctChange },
  };
}

async function processUser(
  profile: ProfileRow,
  periodType: PeriodType,
  current: DateRange,
  prior: DateRange
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient();

  const [{ data: transactions, error: txError }, { data: budgets, error: budgetError }] = await Promise.all([
    admin
      .from('transactions')
      .select('category_id, amount, type, date')
      .eq('user_id', profile.id)
      .is('deleted_at', null)
      .gte('date', toISODate(prior.start))
      .lte('date', toISODate(current.end)),
    admin.from('budgets').select('category_id, monthly_limit').eq('user_id', profile.id).is('deleted_at', null),
  ]);

  if (txError) return { ok: false, error: `transactions fetch: ${txError.message}` };
  if (budgetError) return { ok: false, error: `budgets fetch: ${budgetError.message}` };

  const txRows = (transactions ?? []) as TransactionRow[];
  const budgetRows = (budgets ?? []) as BudgetRow[];

  // A period with no activity at all produces a context with everything zeroed out —
  // skip calling Claude for it rather than generating a hollow reflection.
  const hasActivity = txRows.some((t) => inRange(t.date, current));
  if (!hasActivity) return { ok: true };

  const context = buildContext(txRows, budgetRows, current, prior, profile.currency, periodType);

  const result = await generateStructured<ReflectionResponse>({
    system: SYSTEM_PROMPT,
    userContent: JSON.stringify(context),
    jsonSchema: REFLECTION_SCHEMA,
    maxTokens: 1536,
    effort: 'medium',
  });

  if (!result.ok) {
    return { ok: false, error: `${result.reason}: ${result.detail}` };
  }

  const periodStart = toISODate(current.start);
  const { error: upsertError } = await admin.from('ai_reflections').upsert(
    {
      id: `reflection-${profile.id}-${periodType}-${periodStart}`,
      user_id: profile.id,
      period_type: periodType,
      period_start: periodStart,
      period_end: toISODate(current.end),
      summary: result.data.summary,
      highlights: result.data.highlights,
      category_insight: result.data.categoryInsight,
      context_snapshot: context,
    },
    { onConflict: 'user_id,period_type,period_start' }
  );

  if (upsertError) return { ok: false, error: `upsert: ${upsertError.message}` };
  return { ok: true };
}

const MAX_LOGGED_ERRORS = 20;

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

  let periodType: PeriodType;
  try {
    const body = await req.json();
    if (body.periodType !== 'weekly' && body.periodType !== 'monthly') {
      throw new Error('periodType must be "weekly" or "monthly"');
    }
    periodType = body.periodType;
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const admin = getAdminClient();
  const now = new Date();
  const { current, prior } = periodRangeFor(periodType, now);

  const { data: run } = await admin
    .from('ai_generation_runs')
    .insert({ run_type: periodType === 'weekly' ? 'reflections_weekly' : 'reflections_monthly' })
    .select('id')
    .single();

  let succeeded = 0;
  let failed = 0;
  let page = 0;
  const errors: string[] = [];

  // deno-lint-ignore no-constant-condition
  while (true) {
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, name, currency')
      .range(page * PROFILE_PAGE_SIZE, page * PROFILE_PAGE_SIZE + PROFILE_PAGE_SIZE - 1);

    if (error || !profiles || profiles.length === 0) break;

    const {
      succeeded: s,
      failed: f,
      errors: e,
    } = await processInChunks(profiles as ProfileRow[], CONCURRENCY, (profile) =>
      processUser(profile, periodType, current, prior)
    );
    succeeded += s;
    failed += f;
    if (errors.length < MAX_LOGGED_ERRORS) errors.push(...e.slice(0, MAX_LOGGED_ERRORS - errors.length));

    if (profiles.length < PROFILE_PAGE_SIZE) break;
    page += 1;
  }

  if (run) {
    await admin
      .from('ai_generation_runs')
      .update({
        finished_at: new Date().toISOString(),
        users_processed: succeeded + failed,
        users_failed: failed,
        error_summary: errors.length > 0 ? { sample: errors } : null,
      })
      .eq('id', run.id);
  }

  return new Response(JSON.stringify({ periodType, processed: succeeded + failed, succeeded, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
