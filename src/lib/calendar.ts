import type { Locale } from "@/i18n/config";

/** Calendar math in the browser's local time. Weekdays are 0 = Sunday … 6 = Saturday. */

/** Arabic calendars start the week on Saturday, English ones on Sunday. */
export const weekStartFor = (locale: Locale) => (locale === "ar" ? 6 : 0);

/** The seven weekdays in display order. */
export const weekdayOrder = (locale: Locale) => Array.from({ length: 7 }, (_, i) => (weekStartFor(locale) + i) % 7);

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function startOfWeek(d: Date, weekStart: number) {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() - weekStart + 7) % 7));
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Local YYYY-MM-DD, for grouping events by day. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Every day shown on a month page: whole weeks from the one holding the 1st to the one holding the last day. */
export function monthGrid(month: Date, weekStart: number) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const start = startOfWeek(first, weekStart);
  const end = addDays(startOfWeek(last, weekStart), 7);
  const days: Date[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) days.push(d);
  return days;
}

export const minutesIntoDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

export type Timed = { start: Date; end: Date };

/**
 * Side-by-side layout for one day's events: overlapping events share the width,
 * each in its own lane. Returns the lane and the lane count of each event's cluster.
 */
export function layoutLanes<T extends Timed>(events: T[]): (T & { lane: number; lanes: number })[] {
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime());
  const out: (T & { lane: number; lanes: number })[] = [];
  let cluster: (T & { lane: number; lanes: number })[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  const close = () => {
    for (const e of cluster) e.lanes = laneEnds.length;
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const e of sorted) {
    if (e.start.getTime() >= clusterEnd) close();
    let lane = laneEnds.findIndex((end) => end <= e.start.getTime());
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = e.end.getTime();
    cluster.push({ ...e, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, e.end.getTime());
  }
  close();
  return out;
}
