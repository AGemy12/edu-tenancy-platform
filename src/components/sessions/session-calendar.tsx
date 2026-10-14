"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenIcon,
  CalendarXIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  Loader2Icon,
  UserRoundIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import { cn } from "cn";
import { RowActions, type RowAction } from "@/components/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import {
  addDays,
  addMonths,
  dayKey,
  layoutLanes,
  minutesIntoDay,
  monthGrid,
  sameDay,
  startOfDay,
  startOfWeek,
  weekStartFor,
  weekdayOrder,
} from "@/lib/calendar";
import type { LiveSession, SessionStatus } from "@/lib/types";

type Mode = "month" | "week" | "day";
const MODES: Mode[] = ["month", "week", "day"];
const STATUSES: SessionStatus[] = ["SCHEDULED", "LIVE", "COMPLETED", "MISSED", "CANCELED"];
const HOUR_PX = 60;

/** Colors per status, from the theme tokens (same meaning as the status badges). */
const TONE: Record<SessionStatus, { chip: string; dot: string; badge: "info" | "success" | "secondary" | "destructive" | "warning" }> = {
  SCHEDULED: { chip: "border-info bg-info/10 text-info hover:bg-info/20", dot: "bg-info", badge: "info" },
  LIVE: { chip: "border-success bg-success/15 text-success hover:bg-success/25", dot: "bg-success", badge: "success" },
  COMPLETED: {
    chip: "border-muted-foreground/50 bg-muted text-muted-foreground hover:bg-muted/70",
    dot: "bg-muted-foreground/60",
    badge: "secondary",
  },
  MISSED: {
    chip: "border-warning bg-warning/15 text-warning-foreground hover:bg-warning/25 dark:text-warning",
    dot: "bg-warning",
    badge: "warning",
  },
  CANCELED: {
    chip: "border-destructive/60 bg-destructive/10 text-destructive line-through decoration-1 hover:bg-destructive/15",
    dot: "bg-destructive/70",
    badge: "destructive",
  },
};

type Props = {
  sessions: LiveSession[];
  loading: boolean;
  /** The same actions as the row menu in the list view. */
  actionsFor: (s: LiveSession) => RowAction[];
};

/** Re-renders every minute so "today" and the now line stay current. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function SessionCalendar({ sessions, loading, actionsFor }: Props) {
  const { t, format, locale } = useI18n();
  const now = useNow();
  const weekStart = weekStartFor(locale);
  const [mode, setMode] = useState<Mode>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  const byDay = useMemo(() => {
    const map = new Map<string, LiveSession[]>();
    for (const s of [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt))) {
      const key = dayKey(new Date(s.startAt));
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [sessions]);
  const onDay = (d: Date) => byDay.get(dayKey(d)) ?? [];

  const weekFirst = startOfWeek(cursor, weekStart);
  const title =
    mode === "month"
      ? format.month(cursor)
      : mode === "week"
        ? format.dateRange(weekFirst, addDays(weekFirst, 6))
        : format.longDate(cursor);

  function shift(step: number) {
    if (mode === "month") setCursor(addMonths(cursor, step));
    else setCursor(addDays(cursor, step * (mode === "week" ? 7 : 1)));
  }
  function goToday() {
    const today = startOfDay(new Date());
    setCursor(today);
    setSelected(today);
  }
  function select(d: Date) {
    setSelected(d);
    if (d.getMonth() !== cursor.getMonth()) setCursor(d);
  }
  function openDay(d: Date) {
    setSelected(d);
    setCursor(d);
    setMode("day");
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border bg-background p-0.5">
            <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => shift(-1)} aria-label={t("sessions.calendar.previous")}>
              <ChevronLeftIcon className="rtl:rotate-180" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => shift(1)} aria-label={t("sessions.calendar.next")}>
              <ChevronRightIcon className="rtl:rotate-180" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={goToday}>
            {t("sessions.calendar.today")}
          </Button>
          <h2 className="ms-1 text-lg font-bold sm:text-xl" aria-live="polite">
            {title}
          </h2>
          {loading && <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
        </div>
        <Segmented
          label={t("sessions.calendar.modesLabel")}
          value={mode}
          onChange={setMode}
          options={MODES.map((m) => ({ value: m, label: t(`sessions.calendar.modes.${m}`) }))}
        />
      </div>

      {mode === "month" ? (
        // The day panel sits beside the month only on wide screens, so the day cells keep room for their chips.
        <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_21rem]">
          <MonthGrid
            cursor={cursor}
            selected={selected}
            now={now}
            weekStart={weekStart}
            onDay={onDay}
            onSelect={select}
            onOpenDay={openDay}
            actionsFor={actionsFor}
          />
          <DayAgenda date={selected} sessions={onDay(selected)} actionsFor={actionsFor} />
        </div>
      ) : (
        <TimeGrid
          days={mode === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekFirst, i)) : [cursor]}
          now={now}
          onDay={onDay}
          onOpenDay={openDay}
          actionsFor={actionsFor}
        />
      )}

      {/* Legend */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label={t("sessions.calendar.legend")}>
        {STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", TONE[s].dot)} aria-hidden="true" />
            {t(`sessions.status.${s}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────── month ───────── */

function MonthGrid({
  cursor,
  selected,
  now,
  weekStart,
  onDay,
  onSelect,
  onOpenDay,
  actionsFor,
}: {
  cursor: Date;
  selected: Date;
  now: Date;
  weekStart: number;
  onDay: (d: Date) => LiveSession[];
  onSelect: (d: Date) => void;
  onOpenDay: (d: Date) => void;
  actionsFor: Props["actionsFor"];
}) {
  const { t, format, locale } = useI18n();
  const days = monthGrid(cursor, weekStart);
  const weeks = days.length / 7;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {weekdayOrder(locale).map((d) => (
          <div key={d} className="px-1 py-2.5 text-center text-xs font-semibold text-muted-foreground">
            <span className="hidden md:inline">{format.weekday(d, "short")}</span>
            <span className="md:hidden">{format.weekday(d, "narrow")}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7" role="grid">
        {days.map((d, i) => {
          const list = onDay(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, now);
          const isSelected = sameDay(d, selected);
          const lastCol = i % 7 === 6;
          const lastRow = i >= (weeks - 1) * 7;
          return (
            <div
              key={d.toISOString()}
              role="gridcell"
              aria-selected={isSelected}
              className={cn(
                "group relative flex min-h-16 flex-col gap-1 p-1 transition-colors md:min-h-30 md:p-1.5",
                !lastCol && "border-e",
                !lastRow && "border-b",
                !inMonth && "bg-muted/30",
                isSelected ? "bg-primary/8" : "hover:bg-muted/40",
              )}
            >
              {/* The whole cell selects the day; event chips sit above it. */}
              <button
                type="button"
                className="absolute inset-0 z-0 rounded-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                onClick={() => onSelect(d)}
                onDoubleClick={() => onOpenDay(d)}
                aria-label={t("sessions.calendar.dayLabel", {
                  date: format.dayLong(d),
                  count: t("sessions.calendar.sessionsCount", { count: list.length }),
                })}
                aria-pressed={isSelected}
              />
              <span
                className={cn(
                  "pointer-events-none relative mx-auto flex size-7 items-center justify-center rounded-full text-sm tabular-nums md:mx-0",
                  isToday && "bg-primary font-bold text-primary-foreground shadow-sm",
                  !isToday && isSelected && "ring-2 ring-primary/50",
                  !inMonth && !isToday && "text-muted-foreground/60",
                )}
              >
                {format.number(d.getDate())}
              </span>

              {/* Chips from md up */}
              <div className="relative z-10 hidden min-w-0 flex-col gap-1 md:flex">
                {list.slice(0, 3).map((s) => (
                  <SessionPopover key={s.id} session={s} actions={actionsFor(s)}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full min-w-0 items-center gap-1 rounded-md border-s-[3px] px-1.5 py-0.5 text-start text-xs transition-colors",
                        TONE[s.status].chip,
                      )}
                    >
                      {s.status === "LIVE" && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" aria-hidden="true" />}
                      <span className="shrink-0 font-semibold tabular-nums">{format.time(s.startAt)}</span>
                      <bdi className="min-w-0 truncate">{s.title}</bdi>
                    </button>
                  </SessionPopover>
                ))}
                {list.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onSelect(d)}
                    className="self-start rounded-md px-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    {t("sessions.calendar.more", { count: list.length - 3 })}
                  </button>
                )}
              </div>

              {/* Dots on phones */}
              {list.length > 0 && (
                <div className="pointer-events-none relative flex flex-wrap justify-center gap-0.5 md:hidden" aria-hidden="true">
                  {list.slice(0, 4).map((s) => (
                    <span key={s.id} className={cn("size-1.5 rounded-full", TONE[s.status].dot)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayAgenda({ date, sessions, actionsFor }: { date: Date; sessions: LiveSession[]; actionsFor: Props["actionsFor"] }) {
  const { t, format } = useI18n();
  return (
    <aside className="rounded-2xl border bg-card p-4 shadow-soft 2xl:sticky 2xl:top-4">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">{format.weekday(date.getDay())}</p>
          <h3 className="text-xl font-bold">{format.longDate(date)}</h3>
        </div>
        <Badge variant="secondary" className="mt-1 shrink-0">
          {t("sessions.calendar.sessionsCount", { count: sessions.length })}
        </Badge>
      </header>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <CalendarXIcon className="size-5" aria-hidden="true" />
          </span>
          <p className="font-semibold">{t("sessions.calendar.emptyDay")}</p>
          <p className="text-sm text-muted-foreground">{t("sessions.calendar.emptyDayHint")}</p>
        </div>
      ) : (
        <ol className="relative space-y-3 before:absolute before:inset-y-2 before:start-[0.4375rem] before:w-px before:bg-border">
          {sessions.map((s) => (
            <li key={s.id} className="relative flex gap-3">
              <span
                className={cn("relative z-10 mt-4 size-3.5 shrink-0 rounded-full border-2 border-card", TONE[s.status].dot)}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 rounded-xl border bg-background/60 p-3 transition-colors hover:bg-muted/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground tabular-nums">{format.timeRange(s.startAt, s.endAt)}</p>
                    <p className={cn("truncate font-semibold", s.status === "CANCELED" && "line-through decoration-1")}>
                      <bdi>{s.title}</bdi>
                    </p>
                  </div>
                  <RowActions actions={actionsFor(s)} label={s.title} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <UserRoundIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  <bdi className="truncate">{s.teacher.user.fullName}</bdi>
                  {s.course && (
                    <>
                      <span aria-hidden="true">·</span>
                      <bdi className="truncate">{s.course.title}</bdi>
                    </>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant={TONE[s.status].badge}>
                    {s.status === "LIVE" && <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />}
                    {t(`sessions.status.${s.status}`)}
                  </Badge>
                  <Badge variant="outline">{t(`sessions.provider.${s.provider}`)}</Badge>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

/* ───────── week / day ───────── */

function TimeGrid({
  days,
  now,
  onDay,
  onOpenDay,
  actionsFor,
}: {
  days: Date[];
  now: Date;
  onDay: (d: Date) => LiveSession[];
  onOpenDay: (d: Date) => void;
  actionsFor: Props["actionsFor"];
}) {
  const { t, format } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const columns = days.map((d) => ({
    day: d,
    events: layoutLanes(onDay(d).map((s) => ({ session: s, start: new Date(s.startAt), end: new Date(s.endAt) }))),
  }));

  // Show 8:00–22:00 at least, widened to fit every session in view.
  const all = columns.flatMap((c) => c.events);
  const firstHour = Math.min(8, ...all.map((e) => e.start.getHours()));
  const lastHour = Math.max(22, ...all.map((e) => (sameDay(e.start, e.end) ? Math.ceil(minutesIntoDay(e.end) / 60) : 24)));
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const height = hours.length * HOUR_PX;
  const top = (d: Date) => ((minutesIntoDay(d) - firstHour * 60) / 60) * HOUR_PX;

  // Start scrolled to the first session in view, or to the current hour.
  const firstKey = days.map(dayKey).join();
  useEffect(() => {
    const anchor = all.length ? Math.min(...all.map((e) => minutesIntoDay(e.start))) : minutesIntoDay(new Date());
    scroller.current?.scrollTo({ top: Math.max(0, ((anchor - firstHour * 60) / 60 - 0.5) * HOUR_PX) });
    // Only when the visible days change, not on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstKey]);

  const cols = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="overflow-x-auto">
        <div className={cn(days.length > 1 && "min-w-[46rem]")}>
          {/* Day headers */}
          <div className="grid border-b bg-muted/40" style={{ gridTemplateColumns: cols }}>
            <div />
            {days.map((d) => {
              const isToday = sameDay(d, now);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => onOpenDay(d)}
                  className="flex flex-col items-center gap-0.5 border-s py-2 transition-colors hover:bg-muted/60"
                >
                  <span className={cn("text-xs font-semibold", isToday ? "text-primary" : "text-muted-foreground")}>
                    {format.weekday(d.getDay(), days.length > 1 ? "short" : "long")}
                  </span>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-base font-bold tabular-nums",
                      isToday && "bg-primary text-primary-foreground shadow-sm",
                    )}
                  >
                    {format.number(d.getDate())}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Hours */}
          <div ref={scroller} className="max-h-[68vh] overflow-y-auto">
            <div className="relative grid" style={{ gridTemplateColumns: cols, height }}>
              <div className="relative">
                {hours.map((h, i) =>
                  i === 0 ? null : (
                    <span
                      key={h}
                      className="absolute end-2 -translate-y-1/2 text-[0.6875rem] text-muted-foreground tabular-nums"
                      style={{ top: i * HOUR_PX }}
                    >
                      {format.hour(new Date(2000, 0, 1, h))}
                    </span>
                  ),
                )}
              </div>

              {columns.map(({ day, events }) => {
                const isToday = sameDay(day, now);
                const nowTop = top(now);
                return (
                  <div key={day.toISOString()} className={cn("relative border-s", isToday && "bg-primary/4")}>
                    {hours.map((h, i) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-border/70"
                        style={{ top: i * HOUR_PX }}
                        aria-hidden="true"
                      >
                        <div className="absolute inset-x-0 border-t border-dashed border-border/40" style={{ top: HOUR_PX / 2 }} />
                      </div>
                    ))}

                    {events.map(({ session: s, start, end, lane, lanes }) => {
                      const y = top(start);
                      const endY = sameDay(start, end) ? top(end) : height;
                      const h = Math.max(endY - y, 26);
                      const compact = h < 46;
                      return (
                        <SessionPopover key={s.id} session={s} actions={actionsFor(s)}>
                          <button
                            type="button"
                            className={cn(
                              "absolute z-10 flex flex-col overflow-hidden rounded-lg border-s-[3px] px-2 py-1 text-start text-xs shadow-sm ring-1 ring-card transition-[filter,box-shadow] hover:z-20 hover:shadow-md",
                              TONE[s.status].chip,
                            )}
                            style={{
                              top: y + 1,
                              height: h - 2,
                              insetInlineStart: `calc(${(lane / lanes) * 100}% + 2px)`,
                              width: `calc(${100 / lanes}% - 4px)`,
                            }}
                          >
                            <span className={cn("flex min-w-0 items-center gap-1", compact ? "" : "font-semibold")}>
                              {s.status === "LIVE" && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" aria-hidden="true" />}
                              {compact && <span className="shrink-0 font-semibold tabular-nums">{format.time(s.startAt)}</span>}
                              <bdi className="min-w-0 truncate">{s.title}</bdi>
                            </span>
                            {!compact && (
                              <>
                                <span className="tabular-nums opacity-90">{format.timeRange(s.startAt, s.endAt)}</span>
                                {h >= 76 && (
                                  <bdi className="truncate opacity-80">{s.teacher.user.fullName}</bdi>
                                )}
                              </>
                            )}
                          </button>
                        </SessionPopover>
                      );
                    })}

                    {isToday && nowTop >= 0 && nowTop <= height && (
                      <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top: nowTop }} aria-label={t("sessions.calendar.now")}>
                        <div className="relative h-0.5 bg-coral">
                          <span className="absolute -top-[0.3rem] -start-[0.3rem] size-3 rounded-full bg-coral ring-2 ring-card" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── shared ───────── */

/** Details of one session and its actions, opened from a chip or a block. */
function SessionPopover({ session: s, actions, children }: { session: LiveSession; actions: RowAction[]; children: React.ReactNode }) {
  const { t, format } = useI18n();
  const [open, setOpen] = useState(false);
  const visible = actions.filter(Boolean);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-3 rounded-2xl p-4">
        <div className="space-y-2">
          <Badge variant={TONE[s.status].badge}>
            {s.status === "LIVE" && <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />}
            {t(`sessions.status.${s.status}`)}
          </Badge>
          <p className="text-base leading-snug font-bold">
            <bdi>{s.title}</bdi>
          </p>
        </div>
        <dl className="space-y-2 text-sm">
          <Detail icon={ClockIcon} label={t("fields.startAt")}>
            <span className="block">{format.dayLong(s.startAt)}</span>
            <span className="block text-muted-foreground tabular-nums">{format.timeRange(s.startAt, s.endAt)}</span>
          </Detail>
          <Detail icon={UserRoundIcon} label={t("fields.teacher")}>
            <bdi>{s.teacher.user.fullName}</bdi>
          </Detail>
          {s.course && (
            <Detail icon={BookOpenIcon} label={t("fields.course")}>
              <bdi>{s.course.title}</bdi>
            </Detail>
          )}
          {s._count && (
            <Detail icon={UsersIcon} label={t("sessions.columns.students")}>
              {t("sessions.calendar.studentsCount", { count: s._count.attendees })}
            </Detail>
          )}
          <Detail icon={VideoIcon} label={t("sessions.columns.provider")}>
            {t(`sessions.provider.${s.provider}`)}
          </Detail>
        </dl>
        {visible.length > 0 && (
          <>
            <Separator />
            <div className="-mx-1 flex flex-col">
              {visible.map((a, i) => {
                const Icon = a.icon;
                const className = cn(
                  "justify-start gap-2.5 rounded-lg px-2.5 font-normal",
                  a.variant === "destructive" && "text-destructive hover:bg-destructive/10 hover:text-destructive",
                );
                const content = (
                  <>
                    {Icon && <Icon aria-hidden="true" />}
                    {a.label}
                  </>
                );
                return (
                  <div key={a.label}>
                    {a.separatorBefore && i > 0 && <Separator className="my-1" />}
                    {a.href ? (
                      <Button asChild variant="ghost" size="sm" className={cn("w-full", className)}>
                        <Link href={a.href} target={a.external ? "_blank" : undefined} rel={a.external ? "noreferrer" : undefined}>
                          {content}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={a.disabled}
                        className={cn("w-full", className)}
                        onClick={() => {
                          setOpen(false);
                          a.onClick?.();
                        }}
                      >
                        {content}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Detail({ icon: Icon, label, children }: { icon: typeof ClockIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <dt className="mt-0.5 shrink-0 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** A pill-shaped single choice (month / week / day, calendar / list). */
export function Segmented<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string; icon?: typeof ClockIcon }[];
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-0.5 rounded-full bg-muted p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-all",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.icon && <o.icon className="size-4" aria-hidden="true" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
