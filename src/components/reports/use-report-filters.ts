"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTenantMe } from "@/hooks/use-resources";
import type { ReportParams } from "@/hooks/use-reports";

export const PERIODS = ["thisMonth", "lastMonth", "last30", "last90", "thisYear", "custom"] as const;
export type Period = (typeof PERIODS)[number];

const DAY_MS = 86_400_000;
const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => fromUtc(toUtc(day) + n * DAY_MS);
const isDay = (v: string | null): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toUtc(v)));

/** Today's date ("YYYY-MM-DD") in the center's time zone: reports count whole days there. */
export function todayIn(timeZone: string | undefined) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }
}

/** The days a period covers, both included. */
export function periodDays(period: Period, today: string, custom: { from: string; to: string }) {
  const [y, m] = today.split("-").map(Number);
  const monthStart = (yy: number, mm: number) => fromUtc(Date.UTC(yy, mm - 1, 1));
  switch (period) {
    case "lastMonth":
      return { from: monthStart(y, m - 1), to: addDays(monthStart(y, m), -1) };
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "last90":
      return { from: addDays(today, -89), to: today };
    case "thisYear":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "custom":
      return custom.from <= custom.to ? custom : { from: custom.to, to: custom.from };
    default:
      return { from: monthStart(y, m), to: addDays(monthStart(y, m + 1), -1) };
  }
}

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/**
 * Report filters live in the URL (`?period=lastMonth&teacher=…&course=…`), so a report can be
 * bookmarked, shared and reopened as it was, and the hub and detail pages keep the same period.
 */
export function useReportFilters() {
  const params = useSearchParams();
  const tenant = useTenantMe();
  const today = todayIn(tenant.data?.timezone);

  const filters = useMemo(() => {
    const monthStart = `${today.slice(0, 8)}01`;
    return {
      period: pick(params.get("period"), PERIODS, "thisMonth"),
      from: isDay(params.get("from")) ? params.get("from")! : monthStart,
      to: isDay(params.get("to")) ? params.get("to")! : today,
      teacher: params.get("teacher") ?? "",
      course: params.get("course") ?? "",
    };
  }, [params, today]);

  const range = useMemo(() => periodDays(filters.period, today, { from: filters.from, to: filters.to }), [filters, today]);

  const query = useMemo<ReportParams>(
    () => ({ from: range.from, to: range.to, teacherId: filters.teacher || undefined, courseId: filters.course || undefined }),
    [range, filters.teacher, filters.course],
  );

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const qs = next.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    },
    [params],
  );

  /** The period part of the URL, to carry it over to a detail page. */
  const carry = useMemo(() => {
    const keep = new URLSearchParams();
    for (const key of ["period", "from", "to"]) {
      const v = params.get(key);
      if (v) keep.set(key, v);
    }
    return keep.toString();
  }, [params]);

  return { filters, range, query, set, carry, ready: !tenant.isPending };
}

export type ReportFilters = ReturnType<typeof useReportFilters>;
