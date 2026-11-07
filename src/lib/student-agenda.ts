import { addDays, dayKey, startOfDay } from "@/lib/calendar";
import type { LiveSession } from "@/lib/types";

/** How early a student may enter a scheduled session. Mirrors `EARLY_ENTRY_MIN` in the API's session-lifecycle. */
export const EARLY_ENTRY_MIN = 15;
/** How many days ahead "coming days" lists; later ones are left to the calendar. */
const HORIZON_DAYS = 7;
const MIN = 60_000;

/**
 * What a student can do with a session right now, which is all the join button shows:
 * not yet (grey, with the time it opens), open (green), live (green, pulsing), canceled, or over.
 */
export type EntryState = "early" | "open" | "live" | "canceled" | "over";

export function entryState(s: LiveSession, now: Date): EntryState {
  if (s.status === "CANCELED") return "canceled";
  if (s.status === "LIVE") return "live";
  if (s.status !== "SCHEDULED") return "over";
  return now.getTime() >= opensAt(s).getTime() ? "open" : "early";
}

/**
 * The letter for a person's picture: the first letter of their name, past a title such as "أ." or
 * "Mr." (otherwise every teacher called "أ. …" gets the same "أ").
 */
export function initialOf(name: string) {
  const words = name.trim().split(/\s+/);
  const word = words.find((w) => !w.endsWith(".")) ?? words[0] ?? "";
  return Array.from(word)[0] ?? "";
}

/** When the join button turns green. */
export const opensAt = (s: LiveSession) => new Date(new Date(s.startAt).getTime() - EARLY_ENTRY_MIN * MIN);

/** Still ahead or under way: something the student may yet enter. */
const isAhead = (s: LiveSession, now: Date) => s.status === "LIVE" || (s.status === "SCHEDULED" && new Date(s.endAt) > now);
/** A canceled session that hasn't come yet stays in view, so the student knows not to wait for it. */
const isCanceledAhead = (s: LiveSession, now: Date) => s.status === "CANCELED" && new Date(s.startAt) > now;

export type StudentAgenda = {
  /** The one to show big: a live session first, else the soonest one still ahead. */
  next: LiveSession | null;
  /** The rest of today, after `next`. */
  laterToday: LiveSession[];
  /** The next few days, one group per day. */
  upcoming: { day: Date; sessions: LiveSession[] }[];
  /** Sessions further ahead than `upcoming` covers. */
  beyond: number;
  /** Over, newest first. */
  past: LiveSession[];
};

export function studentAgenda(sessions: LiveSession[], now: Date): StudentAgenda {
  const sorted = [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const ahead = sorted.filter((s) => isAhead(s, now));
  const next = ahead.find((s) => s.status === "LIVE") ?? ahead[0] ?? null;

  const tomorrow = addDays(startOfDay(now), 1);
  const horizon = addDays(tomorrow, HORIZON_DAYS);
  const rest = sorted.filter((s) => s !== next && (isAhead(s, now) || isCanceledAhead(s, now)));
  const laterToday = rest.filter((s) => new Date(s.startAt) < tomorrow);

  const groups = new Map<string, { day: Date; sessions: LiveSession[] }>();
  for (const s of rest) {
    const start = new Date(s.startAt);
    if (start < tomorrow || start >= horizon) continue;
    const key = dayKey(start);
    const group = groups.get(key) ?? { day: startOfDay(start), sessions: [] };
    group.sessions.push(s);
    groups.set(key, group);
  }

  return {
    next,
    laterToday,
    upcoming: [...groups.values()],
    beyond: rest.filter((s) => new Date(s.startAt) >= horizon).length,
    past: sorted.filter((s) => !isAhead(s, now) && !isCanceledAhead(s, now)).reverse(),
  };
}
