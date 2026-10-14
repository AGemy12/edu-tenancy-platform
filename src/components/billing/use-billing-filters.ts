"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { BillingParams } from "@/hooks/use-billing";
import type { BillingGroupBy, SessionProvider, SessionStatus } from "@/lib/types";

export const PERIODS = ["thisMonth", "lastMonth", "last7", "last30", "thisYear", "custom"] as const;
export type Period = (typeof PERIODS)[number];

export const SORTS = ["date_desc", "date_asc", "amount_desc", "amount_asc", "duration_desc"] as const;
export type Sort = (typeof SORTS)[number];

export const STATUSES: SessionStatus[] = ["COMPLETED", "LIVE", "SCHEDULED", "CANCELED", "MISSED"];
export const PROVIDERS: SessionProvider[] = ["ZOOM", "GOOGLE_MEET", "MANUAL"];
export const GROUPS: BillingGroupBy[] = ["teacher", "student", "course", "month"];

export type BillingFilters = {
  view: "sessions" | "summary";
  period: Period;
  /** Custom range, as <input type="date"> values (both days included). */
  from: string;
  to: string;
  teacher: string;
  student: string;
  course: string;
  provider: string;
  status: SessionStatus[];
  attendance: string;
  entry: string;
  missing: boolean;
  q: string;
  sort: Sort;
  page: number;
  group: BillingGroupBy;
};

/** Filters that live behind "Advanced filters" (they get chips and a counter). */
export const ADVANCED = ["teacher", "student", "course", "provider", "status", "attendance", "entry", "missing"] as const;
export type AdvancedKey = (typeof ADVANCED)[number];

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

const pad = (n: number) => String(n).padStart(2, "0");
export const dayInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (value: string) => new Date(`${value}T00:00`);

/** The instants a period covers, in the viewer's time: [from, to). */
export function periodRange(period: Period, from: string, to: string, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const tomorrow = new Date(y, m, now.getDate() + 1);
  const daysBack = (n: number) => new Date(y, m, now.getDate() - n);
  switch (period) {
    case "lastMonth":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
    case "last7":
      return { from: daysBack(6), to: tomorrow };
    case "last30":
      return { from: daysBack(29), to: tomorrow };
    case "thisYear":
      return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
    case "custom": {
      const start = startOfDay(from);
      const end = startOfDay(to);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return { from: start, to: new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1) };
      }
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
    }
    default:
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
  }
}

/**
 * Billing filters live in the URL (`?period=lastMonth&teacher=…&status=COMPLETED,CANCELED`), so a
 * filtered view can be bookmarked, shared and restored with the back button.
 */
export function useBillingFilters() {
  const params = useSearchParams();

  const filters = useMemo<BillingFilters>(() => {
    const now = new Date();
    const status = (params.get("status") ?? "")
      .split(",")
      .filter((s): s is SessionStatus => (STATUSES as string[]).includes(s));
    return {
      view: params.get("view") === "summary" ? "summary" : "sessions",
      period: pick(params.get("period"), PERIODS, "thisMonth"),
      from: params.get("from") ?? dayInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: params.get("to") ?? dayInput(now),
      teacher: params.get("teacher") ?? "",
      student: params.get("student") ?? "",
      course: params.get("course") ?? "",
      provider: pick(params.get("provider"), PROVIDERS, "" as SessionProvider),
      status,
      attendance: pick(params.get("attendance"), ["attended", "absent"], ""),
      entry: pick(params.get("entry"), ["confirmed", "unconfirmed"], ""),
      missing: params.get("missing") === "1",
      q: params.get("q") ?? "",
      sort: pick(params.get("sort"), SORTS, "date_desc"),
      page: Math.max(1, Number(params.get("page")) || 1),
      group: pick(params.get("group"), GROUPS, "teacher"),
    };
  }, [params]);

  /** Applies a change. Anything but paging goes back to the first page. */
  const set = useCallback(
    (patch: Partial<Record<keyof BillingFilters, string | boolean | number | string[] | null>>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, raw] of Object.entries(patch)) {
        const value = Array.isArray(raw) ? raw.join(",") : raw === true ? "1" : raw === false || raw == null ? "" : String(raw);
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    },
    [params],
  );

  const clear = useCallback(() => {
    set(Object.fromEntries([...ADVANCED, "q"].map((k) => [k, null])));
  }, [set]);

  const range = useMemo(() => periodRange(filters.period, filters.from, filters.to), [filters.period, filters.from, filters.to]);

  const query = useMemo<BillingParams>(
    () => ({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      teacherId: filters.teacher || undefined,
      studentId: filters.student || undefined,
      courseId: filters.course || undefined,
      provider: filters.provider || undefined,
      status: filters.status.length ? filters.status.join(",") : undefined,
      attendance: filters.attendance || undefined,
      entry: filters.entry || undefined,
      missingRate: filters.missing ? "true" : undefined,
      q: filters.q || undefined,
    }),
    [filters, range],
  );

  const activeCount = ADVANCED.filter((k) => (k === "status" ? filters.status.length > 0 : Boolean(filters[k]))).length;

  return { filters, set, clear, range, query, activeCount };
}
