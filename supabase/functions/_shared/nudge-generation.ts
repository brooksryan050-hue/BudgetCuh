// Shared per-user nudge generation, used by both the daily cron batch
// (generate-nudges) and the client-callable on-demand fallback
// (get-or-generate-nudge) — so the prompt/heuristics never drift between the two
// call sites.
import { getAdminClient } from './supabase-admin.ts';
import { generateStructured } from './anthropic.ts';
import { addDays, getMonthRange, getWeekRange, toISODate } from './dates.ts';
import { computeDailyDisciplineStreak } from './streaks.ts';
import { categoryName } from './categories.ts';
import { levelForPoints } from './gamification.ts';

const TRANSACTION_LOOKBACK_DAYS = 35;

export interface NudgeProfileInput {
  id: string;
  name: string;
  currency: string;
  monthly_income: number;
  points: number;
  created_at: string;
}

export interface NudgeResponse {
  title: string;
  message: string;
  tone: 'celebratory' | 'encouraging' | 'concerned' | 'neutral';
}

export interface GeneratedNudge {
  id: string;
  user_id: string;
  generated_date: string;
  title: string;
  message: string;
  tone: NudgeResponse['tone'];
}

const NUDGE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short headline, max ~8 words' },
    message: {
      type: 'string',
      description:
        '1-3 sentence personalized nudge, must reference at least one concrete number from the input',
    },
    tone: { type: 'string', enum: ['celebratory', 'encouraging', 'concerned', 'neutral'] },
  },
  required: ['title', 'message', 'tone'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are the in-app coaching voice for BudgetCuh, a budgeting app. Given one user's recent financial-discipline data as JSON, write a single short personalized nudge. Reference the specific numbers given (streak days, category name, percentage) naturally in the message — never invent a number that isn't in the input. Keep "message" to 1-3 sentences, warm but not saccharine. Pick "tone" based on whether the data is mostly good news, mixed, concerning, or neutral. If biggestCategorySpike and budgetsNearLimit are both null/empty, focus purely on the streak/positive angle.`;

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

function categoryTotals(transactions: TransactionRow[], startISO: string, endISO: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (t.date < startISO || t.date > endISO) continue;
    totals[t.category_id] = (totals[t.category_id] ?? 0) + t.amount;
  }
  return totals;
}

function findBiggestCategorySpike(transactions: TransactionRow[], referenceDate: Date) {
  const thisWeek = getWeekRange(referenceDate);
  const lastWeek = getWeekRange(addDays(referenceDate, -7));
  const thisWeekTotals = categoryTotals(transactions, toISODate(thisWeek.start), toISODate(thisWeek.end));
  const lastWeekTotals = categoryTotals(transactions, toISODate(lastWeek.start), toISODate(lastWeek.end));

  let best: { categoryId: string; pctChange: number; currentWeekSpend: number } | null = null;
  for (const [categoryId, current] of Object.entries(thisWeekTotals)) {
    const previous = lastWeekTotals[categoryId] ?? 0;
    if (previous < 5) continue;
    const pctChange = ((current - previous) / previous) * 100;
    if (pctChange >= 30 && current >= 20) {
      if (!best || pctChange > best.pctChange) {
        best = { categoryId, pctChange, currentWeekSpend: current };
      }
    }
  }
  return best;
}

function findBudgetsNearLimit(transactions: TransactionRow[], budgets: BudgetRow[], referenceDate: Date) {
  const monthRange = getMonthRange(referenceDate);
  const monthTotals = categoryTotals(transactions, toISODate(monthRange.start), toISODate(monthRange.end));
  const nearLimit: { categoryId: string; pctUsed: number }[] = [];
  for (const budget of budgets) {
    if (budget.monthly_limit <= 0) continue;
    const spent = monthTotals[budget.category_id] ?? 0;
    const pctUsed = (spent / budget.monthly_limit) * 100;
    if (pctUsed >= 85) {
      nearLimit.push({ categoryId: budget.category_id, pctUsed: Math.round(pctUsed) });
    }
  }
  return nearLimit;
}

export async function generateNudgeForUser(
  profile: NudgeProfileInput,
  referenceDate: Date
): Promise<{ ok: true; nudge: GeneratedNudge } | { ok: false; error: string }> {
  const admin = getAdminClient();
  const lookbackStart = toISODate(addDays(referenceDate, -TRANSACTION_LOOKBACK_DAYS));

  const [{ data: transactions, error: txError }, { data: budgets, error: budgetError }] = await Promise.all([
    admin
      .from('transactions')
      .select('category_id, amount, type, date')
      .eq('user_id', profile.id)
      .is('deleted_at', null)
      .gte('date', lookbackStart),
    admin.from('budgets').select('category_id, monthly_limit').eq('user_id', profile.id).is('deleted_at', null),
  ]);

  if (txError) return { ok: false, error: `transactions fetch: ${txError.message}` };
  if (budgetError) return { ok: false, error: `budgets fetch: ${budgetError.message}` };

  const txRows = (transactions ?? []) as TransactionRow[];
  const budgetRows = (budgets ?? []) as BudgetRow[];

  const dailyDisciplineStreak = computeDailyDisciplineStreak(
    txRows,
    profile.monthly_income,
    profile.created_at,
    referenceDate
  );
  const spike = findBiggestCategorySpike(txRows, referenceDate);
  const budgetsNearLimit = findBudgetsNearLimit(txRows, budgetRows, referenceDate);
  const level = levelForPoints(profile.points);

  const context = {
    userName: profile.name,
    currency: profile.currency,
    level,
    dailyDisciplineStreak,
    biggestCategorySpike: spike
      ? {
          categoryName: categoryName(spike.categoryId),
          pctChange: Math.round(spike.pctChange),
          currentWeekSpend: Math.round(spike.currentWeekSpend),
        }
      : null,
    budgetsNearLimit: budgetsNearLimit.map((b) => ({
      categoryName: categoryName(b.categoryId),
      pctUsed: b.pctUsed,
    })),
  };

  const result = await generateStructured<NudgeResponse>({
    system: SYSTEM_PROMPT,
    userContent: JSON.stringify(context),
    jsonSchema: NUDGE_SCHEMA,
    maxTokens: 1024,
    effort: 'low',
  });

  if (!result.ok) {
    return { ok: false, error: `${result.reason}: ${result.detail}` };
  }

  const generatedDate = toISODate(referenceDate);
  const row = {
    id: `nudge-${profile.id}-${generatedDate}`,
    user_id: profile.id,
    generated_date: generatedDate,
    title: result.data.title,
    message: result.data.message,
    tone: result.data.tone,
    context_snapshot: context,
  };

  const { error: upsertError } = await admin
    .from('ai_nudges')
    .upsert(row, { onConflict: 'user_id,generated_date' });

  if (upsertError) return { ok: false, error: `upsert: ${upsertError.message}` };
  return {
    ok: true,
    nudge: {
      id: row.id,
      user_id: row.user_id,
      generated_date: row.generated_date,
      title: row.title,
      message: row.message,
      tone: row.tone,
    },
  };
}
