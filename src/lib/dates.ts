import type { DateRange, ISODate } from '@/types';

export function toISODate(date: Date): ISODate {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromISODate(isoDate: ISODate): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
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

export function isSameWeek(a: Date, b: Date): boolean {
  const rangeA = getWeekRange(a);
  const rangeB = getWeekRange(b);
  return toISODate(rangeA.start) === toISODate(rangeB.start);
}

export function isWithinRange(date: Date, range: DateRange): boolean {
  const t = startOfDay(date).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / msPerDay);
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function getWeekdayLabel(date: Date): string {
  const day = date.getDay();
  return WEEKDAY_LABELS[day === 0 ? 6 : day - 1];
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatWeekRangeLabel(range: DateRange): string {
  const sameMonth = range.start.getMonth() === range.end.getMonth();
  const startLabel = range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = range.end.toLocaleDateString(
    'en-US',
    sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' }
  );
  return `${startLabel} – ${endLabel}`;
}
