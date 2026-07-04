import { addDays, toISODate } from '@/lib/dates';
import type { Transaction } from '@/types';

/**
 * Dev-tools-only: generates a deterministic 30-day transaction history for one of
 * two test personas, so the AI nudge/reflection pipeline and push notifications can
 * be exercised against genuinely different real data instead of waiting on organic
 * usage. Every generated transaction is tagged so loadSimulatedScenario can find and
 * remove a prior run's rows before seeding a new one.
 */
export type SimScenario = 'high_saver' | 'high_spender';

export const SIM_NOTE_TAG = '[sim]';

/** Days back from "today" that the scenario spans, plus one extra day for the
 * boundary-breaking transaction below. */
const WINDOW_DAYS = 30;

export function isSimulatedTransaction(transaction: Pick<Transaction, 'notes'>): boolean {
  return (transaction.notes ?? '').startsWith(SIM_NOTE_TAG);
}

export interface SimTransactionInput {
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  date: string;
  notes: string;
  paymentMethod: 'card';
  isRecurring: boolean;
}

function tx(
  daysAgo: number,
  referenceDate: Date,
  amount: number,
  type: 'income' | 'expense',
  categoryId: string,
  label: string
): SimTransactionInput {
  return {
    amount: Math.round(amount * 100) / 100,
    type,
    categoryId,
    date: toISODate(addDays(referenceDate, -daysAgo)),
    notes: `${SIM_NOTE_TAG} ${label}`,
    paymentMethod: 'card',
    isRecurring: false,
  };
}

export function buildScenarioTransactions(
  monthlyIncome: number,
  scenario: SimScenario,
  referenceDate: Date
): SimTransactionInput[] {
  const income = monthlyIncome > 0 ? monthlyIncome : 4000;
  const dailyLimit = (income * 0.8) / 30;
  const out: SimTransactionInput[] = [];

  out.push(tx(28, referenceDate, income / 2, 'income', 'cat-income', 'Paycheck'));
  out.push(tx(14, referenceDate, income / 2, 'income', 'cat-income', 'Paycheck'));
  out.push(tx(28, referenceDate, income * 0.3, 'expense', 'cat-rent', 'Rent'));
  out.push(tx(27, referenceDate, income * 0.06, 'expense', 'cat-utilities', 'Utilities'));

  // Sits just outside the 30-day window and clearly exceeds the daily limit, so the
  // discipline streak has a clean, deliberate edge at the window boundary instead of
  // silently running back to whatever the account's real creation date happens to be.
  out.push(tx(WINDOW_DAYS, referenceDate, dailyLimit * 3, 'expense', 'cat-shopping', 'One-off big purchase'));

  if (scenario === 'high_saver') {
    out.push(tx(25, referenceDate, 15, 'expense', 'cat-subscriptions', 'Streaming subscription'));
    for (const d of [24, 17, 10, 3]) out.push(tx(d, referenceDate, 42 + (d % 3) * 4, 'expense', 'cat-groceries', 'Groceries'));
    for (const d of [20, 6]) out.push(tx(d, referenceDate, 16, 'expense', 'cat-eating-out', 'Coffee with a friend'));
    out.push(tx(12, referenceDate, 25, 'expense', 'cat-transport', 'Transit pass'));
    // Dev-tools reflection test only looks at the calendar week/month IN PROGRESS
    // (see get-or-generate-reflection), which might only be a couple of days old —
    // guarantee it always has something real to summarize regardless of what day
    // of the month "today" happens to be.
    out.push(tx(2, referenceDate, 14, 'expense', 'cat-eating-out', 'Coffee with a friend'));
    out.push(tx(0, referenceDate, 22, 'expense', 'cat-groceries', 'Groceries'));
  } else {
    out.push(tx(26, referenceDate, 12, 'expense', 'cat-subscriptions', 'Streaming subscription'));
    out.push(tx(19, referenceDate, 18, 'expense', 'cat-subscriptions', 'Gym membership'));
    for (const d of [24, 17, 10, 3]) out.push(tx(d, referenceDate, 55, 'expense', 'cat-groceries', 'Groceries'));

    // Last week's eating-out spend stays low so this week's jump reads as a genuine
    // spike (findBudgetsNearLimit's sibling, findBiggestCategorySpike, needs a >=30%
    // week-over-week increase with at least $20 spent this week).
    out.push(tx(10, referenceDate, 15, 'expense', 'cat-eating-out', 'Dinner out'));
    for (const d of [5, 3, 1]) out.push(tx(d, referenceDate, 32, 'expense', 'cat-eating-out', 'Dinner out'));

    for (const d of [22, 15, 8, 6]) out.push(tx(d, referenceDate, 20 + (d % 4) * 5, 'expense', 'cat-transport', 'Rideshare'));
    for (const d of [21, 9]) out.push(tx(d, referenceDate, 65, 'expense', 'cat-online-shopping', 'Online order'));
    out.push(tx(11, referenceDate, 90, 'expense', 'cat-shopping', 'New shoes'));
    out.push(tx(4, referenceDate, 45, 'expense', 'cat-entertainment', 'Concert tickets'));

    // Recent, deliberate daily-limit break (combined same-day spend well past the
    // limit) so the discipline streak reads as freshly broken, not just short.
    out.push(tx(1, referenceDate, dailyLimit * 0.8, 'expense', 'cat-online-shopping', 'Impulse buy'));
    out.push(tx(1, referenceDate, dailyLimit * 0.7, 'expense', 'cat-eating-out', 'Takeout'));

    // Same guarantee as the high-saver branch: the calendar week/month IN PROGRESS
    // needs real data no matter what day of the month "today" is.
    out.push(tx(2, referenceDate, 48, 'expense', 'cat-online-shopping', 'Online order'));
    out.push(tx(0, referenceDate, 38, 'expense', 'cat-entertainment', 'Night out'));
  }

  return out;
}
