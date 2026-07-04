// Ported from src/lib/dates.ts — keep in sync if that file's date-window math changes.
// Deno can't import RN/Expo code directly, so the pure (zero-React-dependency)
// functions this Edge Function needs are duplicated here rather than imported.

export interface DateRange {
  start: Date;
  end: Date;
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Week starts Monday. */
export function getWeekRange(referenceDate: Date): DateRange {
  const day = referenceDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = startOfDay(addDays(referenceDate, diffToMonday));
  const end = startOfDay(addDays(start, 6));
  return { start, end };
}

export function getMonthRange(referenceDate: Date): DateRange {
  const start = startOfDay(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1));
  const end = startOfDay(new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0));
  return { start, end };
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / msPerDay);
}
