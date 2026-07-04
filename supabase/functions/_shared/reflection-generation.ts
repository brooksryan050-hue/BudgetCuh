// Shared per-user reflection generation, used by both the weekly/monthly cron batch
// (generate-reflections) and the client-callable on-demand test tool
// (get-or-generate-reflection) — so the prompt/heuristics never drift between them.
import { getAdminClient } from './supabase-admin.ts';
import { generateStructured } from './anthropic.ts';
import { addDays, getMonthRange, getWeekRange, toISODate, type DateRange } from './dates.ts';
import { categoryName, DISCRETIONARY_CATEGORY_IDS, RECURRING_CATEGORY_IDS } from './categories.ts';

export type PeriodType = 'weekly' | 'monthly';

/** The last fully-completed week/month relative to `now` — what the cron batch uses. */
export function completedPeriodRangeFor(periodType: PeriodType, now: Date): { current: DateRange; prior: DateRange } {
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

/**
 * The week/month still in progress right now — used only by the dev-tools test
 * button, so testers can see today's just-logged transactions reflected
 * immediately instead of waiting for the period to actually finish.
 */
export function inProgressPeriodRangeFor(periodType: PeriodType, now: Date): { current: DateRange; prior: DateRange } {
  if (periodType === 'weekly') {
    const current = getWeekRange(now);
    const prior = getWeekRange(addDays(current.start, -7));
    return { current, prior };
  }
  const current = getMonthRange(now);
  const priorMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prior = getMonthRange(priorMonthDate);
  return { current, prior };
}

export interface ReflectionProfileInput {
  id: string;
  name: string;
  currency: string;
}

interface ReflectionResponse {
  summary: string;
  highlights: string[];
  categoryInsight: string;
}

export interface GeneratedReflection {
  id: string;
  user_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  summary: string;
  highlights: string[];
  category_insight: string;
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

const SYSTEM_PROMPT = `You write short narrative financial reflections for BudgetCuh users, in the voice of a supportive, observant friend, not a spreadsheet. Given one user's spending data for a completed week or month, write a 2-4 sentence overview, 2-4 short highlight strings, and one sentence focused on a specific category pattern (e.g., a weekend spending spike). Use only the numbers and category names given, do not invent figures. Prefer concrete comparisons (this week vs last, weekday vs weekend) over generic encouragement. Never use em dashes or en dashes anywhere in the output, write with periods, commas, or "and" instead, the way a person would text a friend.`;

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

export async function generateReflectionForUser(
  profile: ReflectionProfileInput,
  periodType: PeriodType,
  current: DateRange,
  prior: DateRange
): Promise<{ ok: true; reflection: GeneratedReflection } | { ok: false; error: string } | { ok: true; reflection: null }> {
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
  if (!hasActivity) return { ok: true, reflection: null };

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
  const row = {
    id: `reflection-${profile.id}-${periodType}-${periodStart}`,
    user_id: profile.id,
    period_type: periodType,
    period_start: periodStart,
    period_end: toISODate(current.end),
    summary: result.data.summary,
    highlights: result.data.highlights,
    category_insight: result.data.categoryInsight,
    context_snapshot: context,
  };

  const { error: upsertError } = await admin
    .from('ai_reflections')
    .upsert(row, { onConflict: 'user_id,period_type,period_start' });

  if (upsertError) return { ok: false, error: `upsert: ${upsertError.message}` };
  return {
    ok: true,
    reflection: {
      id: row.id,
      user_id: row.user_id,
      period_type: row.period_type,
      period_start: row.period_start,
      period_end: row.period_end,
      summary: row.summary,
      highlights: row.highlights,
      category_insight: row.category_insight,
    },
  };
}
