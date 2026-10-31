"use client";

import type { ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { intlLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import type { Outcome, OutcomeCounts, RiskFlag, Trend } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Fill of each outcome (tokens in globals.css). Missed sessions share the canceled gray. */
export const OUTCOME_FILL: Record<Outcome, string> = {
  PRESENT: "bg-outcome-present",
  LATE: "bg-outcome-late",
  EXCUSED: "bg-outcome-excused",
  ABSENT: "bg-outcome-absent",
  UNRECORDED: "bg-outcome-unrecorded",
  UPCOMING: "bg-outcome-upcoming",
  CANCELED: "bg-outcome-canceled",
  MISSED: "bg-outcome-canceled",
};
const OUTCOME_STROKE: Record<Outcome, string> = {
  PRESENT: "var(--outcome-present)",
  LATE: "var(--outcome-late)",
  EXCUSED: "var(--outcome-excused)",
  ABSENT: "var(--outcome-absent)",
  UNRECORDED: "var(--outcome-unrecorded)",
  UPCOMING: "var(--outcome-upcoming)",
  CANCELED: "var(--outcome-canceled)",
  MISSED: "var(--outcome-canceled)",
};
const OUTCOME_BADGE: Record<Outcome, "success" | "warning" | "destructive" | "info" | "outline" | "secondary"> = {
  PRESENT: "success",
  LATE: "warning",
  ABSENT: "destructive",
  EXCUSED: "info",
  UNRECORDED: "outline",
  UPCOMING: "secondary",
  CANCELED: "outline",
  MISSED: "outline",
};

/** Outcomes that took place, in the order charts stack them. */
export const HELD_STACK: Outcome[] = ["PRESENT", "LATE", "EXCUSED", "ABSENT", "UNRECORDED"];

/** Formatting shared by every report screen. */
export function useReportFormat() {
  const { t, format } = useI18n();
  return {
    rate: (n: number | null) => (n === null ? "—" : format.percent(Math.round(n * 100) / 100)),
    score: (n: number | null) => (n === null ? "—" : `${format.number(Math.round(n))}%`),
    rating: (n: number | null) => (n === null ? "—" : t("reports.ratingValue", { rating: format.number(n) })),
    duration: (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (!h) return t("reports.duration.m", { m: format.number(m) });
      if (!m) return t("reports.duration.h", { h: format.number(h) });
      return t("reports.duration.hm", { h: format.number(h), m: format.number(m) });
    },
  };
}

/** Green from 90%, amber from 75%, red below (text and bar colors). */
export const rateTone = (rate: number | null) =>
  rate === null ? "text-muted-foreground" : rate >= 0.9 ? "text-success" : rate >= 0.75 ? "text-warning-foreground dark:text-warning" : "text-destructive";
const rateBar = (rate: number | null) => (rate === null ? "bg-muted" : rate >= 0.9 ? "bg-outcome-present" : rate >= 0.75 ? "bg-outcome-late" : "bg-outcome-absent");

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const { t } = useI18n();
  return (
    <Badge variant={OUTCOME_BADGE[outcome]} className={cn(outcome === "CANCELED" || outcome === "MISSED" ? "text-muted-foreground" : "")}>
      {t(`reports.outcome.${outcome}`)}
    </Badge>
  );
}

export function FlagBadges({ flags }: { flags: RiskFlag[] }) {
  const { t } = useI18n();
  if (!flags.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <Badge key={f} variant={f === "LOW_ATTENDANCE" || f === "ABSENCE_STREAK" ? "destructive" : "warning"}>
          {t(`reports.flag.${f}`)}
        </Badge>
      ))}
    </div>
  );
}

/**
 * The change from the previous period: percentage points for rates (0..1), units for scores,
 * ratings and counts, or a percentage of the earlier value for money and time (`relative`).
 */
export function Delta({
  now,
  before,
  kind,
  better = "up",
}: {
  now: number | null;
  before: number | null | undefined;
  kind: "rate" | "points" | "number" | "relative";
  better?: "up" | "down";
}) {
  const { t, format } = useI18n();
  if (now === null || before === null || before === undefined || (kind === "relative" && before === 0)) return null;
  const diff =
    kind === "rate" ? Math.round((now - before) * 100) : kind === "relative" ? Math.round(((now - before) / Math.abs(before)) * 100) : Math.round((now - before) * 10) / 10;
  if (diff === 0) return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t("reports.delta.same")}</span>;
  const good = better === "up" ? diff > 0 : diff < 0;
  const Icon = diff > 0 ? ArrowUpIcon : ArrowDownIcon;
  const value = format.number(Math.abs(diff));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        good ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
      )}
      title={t("reports.delta.hint")}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span className="sr-only">{t(diff > 0 ? "reports.delta.up" : "reports.delta.down")}</span>
      {kind === "rate" ? t("reports.delta.points", { n: value }) : kind === "relative" ? `${value}%` : value}
    </span>
  );
}

export type Tile = { key: string; label: string; value: string | null; sub?: ReactNode; icon: LucideIcon; tone: string };

export function Tiles({ tiles, loading }: { tiles: Tile[]; loading?: boolean }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", tiles.length >= 5 ? "lg:grid-cols-5" : tiles.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {tiles.map((tile) => (
        <Card key={tile.key} className="gap-0">
          <CardContent className="flex flex-col gap-2 pt-5 sm:pt-6">
            <span className={cn("flex size-9 items-center justify-center rounded-xl sm:size-10", tile.tone)}>
              <tile.icon className="size-5" aria-hidden="true" />
            </span>
            {loading || tile.value === null ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-xl font-bold tabular-nums sm:text-2xl">
                <bdi>{tile.value}</bdi>
              </span>
            )}
            <span className="text-sm text-muted-foreground">{tile.label}</span>
            {tile.sub && !loading && <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">{tile.sub}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** A thin bar for a rate (0..1) or a score (0..100), with an optional marker (e.g. the group average). */
export function Meter({ value, max = 1, label, marker, tone }: { value: number | null; max?: number; label: string; marker?: number | null; tone?: string }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const mark = marker == null ? null : Math.max(0, Math.min(100, (marker / max) * 100));
  return (
    <div className="flex min-w-32 items-center gap-2">
      <div className="relative h-2 flex-1 rounded-full bg-muted">
        <div className={cn("absolute inset-y-0 start-0 rounded-full", tone ?? (max === 1 ? rateBar(value) : "bg-primary"))} style={{ width: `${pct}%` }} />
        {mark !== null && <div className="absolute -inset-y-1 w-0.5 rounded-full bg-highlight" style={{ insetInlineStart: `calc(${mark}% - 1px)` }} />}
      </div>
      <span className={cn("w-11 text-end text-sm font-semibold tabular-nums", max === 1 ? rateTone(value) : "")}>{label}</span>
    </div>
  );
}

/** Attendance as a ring (with the rate in the middle) and its counts beside it. */
export function AttendanceDonut({ counts, rate }: { counts: OutcomeCounts; rate: number | null }) {
  const { t, format } = useI18n();
  const f = useReportFormat();
  const total = HELD_STACK.reduce((n, o) => n + counts[o], 0);
  const shown = HELD_STACK.filter((o) => counts[o] > 0);
  const shares = shown.map((o) => (counts[o] / total) * 100);
  const arcs = shown.map((o, i) => ({
    o,
    // A 1-unit gap between segments keeps neighbors apart when colors are hard to tell.
    dash: Math.max(0, shares[i] - (shown.length > 1 ? 1 : 0)),
    offset: shares.slice(0, i).reduce((a, b) => a + b, 0),
  }));
  const legend: Outcome[] = [...HELD_STACK, "CANCELED", "UPCOMING"];
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative size-40 shrink-0" role="img" aria-label={t("reports.donutLabel", { rate: f.rate(rate) })}>
        <svg viewBox="0 0 36 36" className="size-40 -rotate-90">
          <circle r="15.915" cx="18" cy="18" fill="none" className="stroke-muted" strokeWidth="3.6" />
          {arcs.map((a) => (
            <circle
              key={a.o}
              r="15.915"
              cx="18"
              cy="18"
              fill="none"
              stroke={OUTCOME_STROKE[a.o]}
              strokeWidth="3.6"
              strokeDasharray={`${a.dash} ${100 - a.dash}`}
              strokeDashoffset={-a.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold tabular-nums", rateTone(rate))}>{f.rate(rate)}</span>
          <span className="text-xs text-muted-foreground">{t("reports.attendanceRate")}</span>
        </div>
      </div>
      <ul className="grid w-full flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-1">
        {legend.map((o) => (
          <li key={o} className="flex items-center gap-2">
            <span className={cn("size-2.5 shrink-0 rounded-sm", OUTCOME_FILL[o])} aria-hidden="true" />
            <span className="text-muted-foreground">{t(`reports.outcome.${o}`)}</span>
            <span className="ms-auto font-semibold tabular-nums">{format.number(counts[o])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OutcomeLegend({ outcomes = HELD_STACK }: { outcomes?: Outcome[] }) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {outcomes.map((o) => (
        <li key={o} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", OUTCOME_FILL[o])} aria-hidden="true" />
          {t(`reports.outcome.${o}`)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Stacked columns over time: seats per outcome in each day, week or month, the rate above each
 * column, a tooltip with the exact counts. Time runs with the reading direction.
 */
export function TrendColumns({ trend, mode = "attendance" }: { trend: Trend; mode?: "attendance" | "sessions" }) {
  const { t, format, locale } = useI18n();
  const f = useReportFormat();
  const dayMonth = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" });
  const label = (from: string) => (trend.unit === "month" ? format.monthShort(`${from}T00:00:00Z`) : dayMonth.format(new Date(`${from}T00:00:00Z`)));
  const totals = trend.points.map((p) => (mode === "sessions" ? p.sessions : HELD_STACK.reduce((n, o) => n + p.counts[o], 0)));
  const max = Math.max(1, ...totals);
  return (
    <div className="space-y-3">
      <div className="flex h-48 items-end gap-1 border-b border-border sm:gap-2" role="list" aria-label={t("reports.trendLabel")}>
        {trend.points.map((p, i) => (
          <Tooltip key={p.from}>
            <TooltipTrigger asChild>
              <div role="listitem" tabIndex={0} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-t-md outline-none hover:bg-muted/50 focus-visible:bg-muted/50">
                {totals[i] > 0 && (
                  <span className="text-[0.7rem] font-semibold tabular-nums">{mode === "sessions" ? format.number(p.sessions) : f.rate(p.attendanceRate)}</span>
                )}
                <div className="flex w-full max-w-10 flex-col-reverse gap-0.5" style={{ height: `${(totals[i] / max) * 80}%` }}>
                  {mode === "sessions" ? (
                    <div className="w-full flex-1 rounded-t bg-primary" />
                  ) : (
                    HELD_STACK.filter((o) => p.counts[o] > 0).map((o, k, list) => (
                      <div key={o} className={cn("w-full", OUTCOME_FILL[o], k === list.length - 1 && "rounded-t")} style={{ flexGrow: p.counts[o] }} />
                    ))
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{p.from === p.to ? format.dayUtc(`${p.from}T00:00:00Z`) : format.dateRange(`${p.from}T00:00:00Z`, `${p.to}T00:00:00Z`)}</p>
              {mode === "sessions" ? (
                <p className="tabular-nums">{t("reports.tooltip.sessions", { n: format.number(p.sessions), time: f.duration(p.minutes) })}</p>
              ) : (
                <>
                  {HELD_STACK.filter((o) => p.counts[o] > 0).map((o) => (
                    <p key={o} className="tabular-nums">
                      {t(`reports.outcome.${o}`)}: {format.number(p.counts[o])}
                    </p>
                  ))}
                  <p className="tabular-nums">{t("reports.tooltip.rate", { rate: f.rate(p.attendanceRate) })}</p>
                </>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex gap-1 sm:gap-2">
        {trend.points.map((p, i) => (
          <span key={p.from} className={cn("min-w-0 flex-1 truncate text-center text-[0.68rem] text-muted-foreground", trend.points.length > 8 && i % 2 === 1 && "invisible sm:visible")}>
            {label(p.from)}
          </span>
        ))}
      </div>
      {mode === "attendance" && <OutcomeLegend />}
    </div>
  );
}

/** Month grids of the period; each day shows its seats (one color, or dots when there are several). */
export function AttendanceCalendar({ from, to, days }: { from: string; to: string; days: { date: string; outcomes: Outcome[] }[] }) {
  const { t, format, locale } = useI18n();
  const byDay = new Map(days.map((d) => [d.date, d.outcomes]));
  const firstWeekday = locale === "ar" ? 6 : 0;
  const months: string[] = [];
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); ) {
    months.push(m);
    const [y, mo] = m.split("-").map(Number);
    m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
  }
  return (
    <div className="space-y-4">
      <div className={cn("grid gap-6", months.length > 1 && "md:grid-cols-2")}>
        {months.map((m) => {
          const [y, mo] = m.split("-").map(Number);
          const count = new Date(Date.UTC(y, mo, 0)).getUTCDate();
          const lead = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() - firstWeekday + 7) % 7;
          return (
            <div key={m} className="mx-auto w-full max-w-sm">
              <p className="mb-2 text-sm font-semibold">{format.monthUtc(`${m}-01T00:00:00Z`)}</p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: 7 }, (_, i) => (
                  <span key={i} className="text-[0.65rem] text-muted-foreground">
                    {format.weekday((firstWeekday + i) % 7, "short")}
                  </span>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                  <span key={`b${i}`} />
                ))}
                {Array.from({ length: count }, (_, i) => {
                  const date = `${m}-${String(i + 1).padStart(2, "0")}`;
                  const list = byDay.get(date) ?? [];
                  const out = date < from || date > to;
                  const single = list.length === 1 ? list[0] : null;
                  const label = list.length ? `${format.dayUtc(`${date}T00:00:00Z`)}: ${format.list(list.map((o) => t(`reports.outcome.${o}`)))}` : undefined;
                  return (
                    <div
                      key={date}
                      title={label}
                      aria-label={label}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center rounded-md text-xs tabular-nums",
                        out ? "text-muted-foreground/40" : "bg-muted/60 text-muted-foreground",
                        list.length > 0 && "font-semibold text-foreground",
                        single && cn(OUTCOME_FILL[single], single === "UNRECORDED" || single === "CANCELED" || single === "MISSED" ? "text-foreground" : "text-white"),
                      )}
                    >
                      {format.number(i + 1)}
                      {list.length > 1 && (
                        <span className="mt-0.5 flex gap-0.5">
                          {list.slice(0, 4).map((o, k) => (
                            <span key={k} className={cn("size-1.5 rounded-full", OUTCOME_FILL[o])} />
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <OutcomeLegend outcomes={["PRESENT", "LATE", "EXCUSED", "ABSENT", "UNRECORDED", "UPCOMING", "CANCELED"]} />
    </div>
  );
}

/** Score bands of an exam as one segmented bar. */
export function Distribution({ bands }: { bands: number[] }) {
  const { t, format } = useI18n();
  const total = bands.reduce((a, b) => a + b, 0);
  if (!total) return <span className="text-muted-foreground">—</span>;
  const fills = ["bg-outcome-absent", "bg-outcome-late", "bg-chart-5", "bg-chart-1", "bg-outcome-present"];
  return (
    <div className="flex h-2.5 min-w-28 gap-0.5 overflow-hidden rounded-full">
      {bands.map((n, i) =>
        n ? (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className={cn("h-full", fills[i])} style={{ flexGrow: n }} tabIndex={0} aria-label={t("reports.band", { band: t(`reports.bands.b${i as 0 | 1 | 2 | 3 | 4}`), n: format.number(n) })} />
            </TooltipTrigger>
            <TooltipContent>{t("reports.band", { band: t(`reports.bands.b${i as 0 | 1 | 2 | 3 | 4}`), n: format.number(n) })}</TooltipContent>
          </Tooltip>
        ) : null,
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">{children}</p>;
}
