"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheckIcon, ChevronDownIcon, ClipboardCheckIcon, ClockIcon, LockIcon, VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isolate } from "@/components/notifications/notification-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { useList } from "@/hooks/use-resources";
import { joinSession, ringingKey } from "@/hooks/use-ringing";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { getErrorMessage } from "@/lib/api";
import { addDays, sameDay } from "@/lib/calendar";
import { EARLY_ENTRY_MIN, entryState, initialOf, opensAt, studentAgenda, type EntryState } from "@/lib/student-agenda";
import type { LiveSession } from "@/lib/types";

const PAST_PAGE = 5;

/** Enters a session's meeting in a new tab (recording attendance), with one button busy at a time. */
export function useEnterSession() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function enter(s: LiveSession) {
    setJoiningId(s.id);
    try {
      await joinSession(s.id);
      // Entered here: the incoming-call screen has nothing left to ring for.
      qc.setQueryData(ringingKey, null);
      qc.invalidateQueries({ queryKey: ["list"] });
    } catch (e) {
      toast.error(getErrorMessage(e, t("sessions.toast.openFailed")));
    } finally {
      setJoiningId(null);
    }
  }
  return { enter, joiningId };
}

type JoinProps = {
  onJoin: (s: LiveSession) => void;
  joiningId: string | null;
  /** False while the account is suspended: the API hands out no meeting link then. */
  canJoin: boolean;
};

/** "Today", "Tomorrow" or the weekday and date. */
function useDayLabel(now: Date) {
  const { t, format } = useI18n();
  return (d: Date) =>
    sameDay(d, now) ? t("sessions.student.today") : sameDay(d, addDays(now, 1)) ? t("sessions.student.tomorrow") : format.dayLong(d);
}

/** The teacher's initial in a circle, the same face the incoming-call screen shows. */
function TeacherInitial({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-highlight font-bold text-highlight-foreground", className)}
    >
      {initialOf(name)}
    </span>
  );
}

function LiveDot() {
  return <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current motion-safe:animate-pulse" />;
}

/**
 * The one button a student needs. Green means go in; grey says when it opens; nothing for a
 * canceled or finished session, so there's never a button that can't work.
 */
function JoinButton({ session: s, state, now, size, onJoin, joiningId }: { session: LiveSession; state: EntryState; now: Date; size: "lg" | "sm" } & Omit<JoinProps, "canJoin">) {
  const { t, format } = useI18n();
  const big = size === "lg";
  if (state === "early") {
    const at = opensAt(s);
    const label = sameDay(at, now)
      ? t("sessions.student.opensAt", { time: format.time(at) })
      : sameDay(at, addDays(now, 1))
        ? t("sessions.student.opensTomorrow", { time: format.time(at) })
        : t("sessions.student.opensOn", { day: format.dayLong(at), time: format.time(at) });
    return (
      <Button disabled variant="secondary" className={cn("w-full rounded-2xl font-bold disabled:opacity-100", big ? "h-16 text-lg" : "h-12 text-base sm:w-auto")}>
        <LockIcon aria-hidden="true" data-icon="inline-start" />
        {label}
      </Button>
    );
  }
  if (state !== "open" && state !== "live") return null;
  return (
    <Button
      onClick={() => onJoin(s)}
      disabled={joiningId === s.id}
      className={cn(
        "w-full rounded-2xl bg-success font-bold text-success-foreground hover:bg-success/90",
        big ? "h-16 text-xl" : "h-12 px-6 text-base sm:w-auto",
        state === "live" && "motion-safe:animate-[join-glow_1.6s_ease-out_infinite]",
      )}
    >
      <VideoIcon aria-hidden="true" data-icon="inline-start" />
      {state === "live" ? t("sessions.student.enterNow") : t("sessions.student.enter")}
    </Button>
  );
}

/** "Your next session": who, when, how long until it starts, and the button. */
export function NextSessionCard({ session: s, now, onJoin, joiningId, canJoin }: { session: LiveSession; now: Date } & JoinProps) {
  const { t, format } = useI18n();
  const dayLabel = useDayLabel(now);
  const state = entryState(s, now);
  const go = state === "open" || state === "live";
  const start = new Date(s.startAt);

  const countdown =
    state === "live"
      ? t("sessions.student.started")
      : start <= now
        ? t("sessions.student.timeCame")
        : sameDay(start, now)
          ? t("sessions.student.startsIn", { when: format.relative(start, now.getTime()) })
          : sameDay(start, addDays(now, 1))
            ? t("sessions.student.startsTomorrow", { time: format.time(start) })
            : t("sessions.student.startsOn", { day: format.dayLong(start), time: format.time(start) });
  const hint = !canJoin
    ? t("sessions.student.hint.suspended")
    : state === "early"
      ? t("sessions.student.hint.early", { minutes: format.number(EARLY_ENTRY_MIN) })
      : state === "live"
        ? t("sessions.student.hint.live")
        : t("sessions.student.hint.open");

  return (
    <section
      aria-label={t("sessions.student.next")}
      className={cn(
        "flex flex-wrap items-center justify-between gap-6 rounded-3xl border-2 bg-card p-5 shadow-soft sm:p-7",
        go ? "border-success" : "border-border",
        state === "live" && "bg-success/5",
      )}
    >
      <div className="flex min-w-0 flex-[1_1_20rem] items-center gap-4 sm:gap-5">
        <TeacherInitial name={s.teacher.user.fullName} className="size-20 text-4xl sm:size-24 sm:text-5xl" />
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          {state === "live" ? (
            <Badge variant="success" className="h-7 gap-2 px-3 text-sm font-bold">
              <LiveDot />
              {t("sessions.student.live")}
            </Badge>
          ) : (
            <Badge variant="secondary" className="h-7 px-3 text-sm">
              {t("sessions.student.next")}
            </Badge>
          )}
          <h2 className="text-2xl leading-snug font-bold wrap-break-word sm:text-3xl">
            <bdi>{s.title}</bdi>
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">{t("sessions.student.withTeacher", { name: isolate(s.teacher.user.fullName) })}</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums sm:text-base">
            <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
            {t("sessions.student.when", { day: dayLabel(start), time: format.timeRange(s.startAt, s.endAt) })}
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:min-w-72 sm:flex-[0_1_20rem]">
        <p aria-live="polite" className={cn("text-center text-xl font-bold", go && "text-success")}>
          {countdown}
        </p>
        {canJoin && <JoinButton session={s} state={state} now={now} size="lg" onJoin={onJoin} joiningId={joiningId} />}
        <p className="text-center text-sm text-muted-foreground">{hint}</p>
      </div>
    </section>
  );
}

function NoneAhead({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <section className={cn("flex flex-col items-center gap-2 rounded-3xl border border-dashed bg-card px-6 py-10 text-center", className)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <CalendarCheckIcon className="size-6" aria-hidden="true" />
      </span>
      <p className="text-lg font-semibold">{t("sessions.student.noneTitle")}</p>
      <p className="text-sm text-muted-foreground">{t("sessions.student.noneText")}</p>
    </section>
  );
}

/** A session later today: its own button, smaller than the one at the top. */
function TodayRow({ session: s, now, onJoin, joiningId, canJoin }: { session: LiveSession; now: Date } & JoinProps) {
  const { t, format } = useI18n();
  const state = entryState(s, now);
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-soft sm:px-5">
      <div className="flex min-w-0 items-center gap-4">
        <span className={cn("shrink-0 text-lg font-bold whitespace-nowrap tabular-nums", state === "canceled" && "text-muted-foreground line-through")}>
          {format.time(s.startAt)}
        </span>
        <TeacherInitial name={s.teacher.user.fullName} className="size-12 text-xl" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("font-bold wrap-break-word sm:text-lg", state === "canceled" && "text-muted-foreground line-through decoration-1")}>
            <bdi>{s.title}</bdi>
          </span>
          <span className="text-sm text-muted-foreground">{t("sessions.student.withTeacher", { name: isolate(s.teacher.user.fullName) })}</span>
        </div>
      </div>
      {state === "canceled" ? (
        <Badge variant="destructive" className="h-7 px-3 text-sm font-bold">
          {t("sessions.student.canceled")}
        </Badge>
      ) : (
        canJoin && <JoinButton session={s} state={state} now={now} size="sm" onJoin={onJoin} joiningId={joiningId} />
      )}
    </li>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-bold sm:text-xl">{children}</h3>;
}

type AgendaProps = JoinProps & {
  sessions: LiveSession[];
  loading: boolean;
  onEvaluation: (s: LiveSession) => void;
  onShowCalendar: () => void;
};

/**
 * A student's sessions without a calendar to read: the next one big at the top, the rest of today,
 * the coming days, and the past (with evaluations) folded away.
 */
export default function StudentAgendaView({ sessions, loading, onEvaluation, onShowCalendar, ...join }: AgendaProps) {
  const { t, format } = useI18n();
  const now = useNow();
  const dayLabel = useDayLabel(now);
  const [pastShown, setPastShown] = useState(0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  const agenda = studentAgenda(sessions, now);
  const past = agenda.past.slice(0, pastShown);

  return (
    <div className="space-y-8">
      {agenda.next ? <NextSessionCard session={agenda.next} now={now} {...join} /> : <NoneAhead />}

      {agenda.laterToday.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>{t("sessions.student.laterToday")}</SectionTitle>
          <ul className="space-y-3">
            {agenda.laterToday.map((s) => (
              <TodayRow key={s.id} session={s} now={now} {...join} />
            ))}
          </ul>
        </section>
      )}

      {agenda.upcoming.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>{t("sessions.student.upcoming")}</SectionTitle>
          <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
            {agenda.upcoming.map(({ day, sessions: list }, i) => (
              <div key={day.toISOString()} className={cn(i > 0 && "border-t")}>
                <h4 className="bg-muted/50 px-5 py-2 text-sm font-semibold text-muted-foreground">{dayLabel(day)}</h4>
                <ul>
                  {list.map((s) => {
                    const canceled = s.status === "CANCELED";
                    return (
                      <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-5 py-3.5">
                        <span className={cn("w-20 shrink-0 font-bold whitespace-nowrap tabular-nums", canceled && "text-muted-foreground line-through")}>
                          {format.time(s.startAt)}
                        </span>
                        <span className={cn("min-w-0 font-semibold wrap-break-word", canceled && "text-muted-foreground")}>
                          <bdi>{s.title}</bdi>
                        </span>
                        <span className="text-sm text-muted-foreground">{t("sessions.student.withTeacher", { name: isolate(s.teacher.user.fullName) })}</span>
                        {canceled && (
                          <Badge variant="destructive" className="ms-auto font-bold">
                            {t("sessions.student.canceled")}
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          {agenda.beyond > 0 && (
            <button type="button" onClick={onShowCalendar} className="text-sm font-semibold text-primary hover:underline">
              {t("sessions.student.beyond", { count: agenda.beyond })}
            </button>
          )}
        </section>
      )}

      {agenda.past.length > 0 && (
        <section className="space-y-3">
          <button
            type="button"
            aria-expanded={pastShown > 0}
            onClick={() => setPastShown(pastShown > 0 ? 0 : PAST_PAGE)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed px-5 py-4 text-start text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <span>{pastShown > 0 ? t("sessions.student.hidePast") : t("sessions.student.showPast", { count: format.number(agenda.past.length) })}</span>
            <ChevronDownIcon className={cn("size-5 shrink-0 transition-transform", pastShown > 0 && "rotate-180")} aria-hidden="true" />
          </button>
          {past.length > 0 && (
            <ul className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              {past.map((s, i) => {
                // Once a session has begun the teacher evaluates it; a canceled one has nothing to read.
                const evaluable = s.status !== "CANCELED" && new Date(s.startAt) <= now;
                return (
                  <li key={s.id} className={cn("flex flex-wrap items-center justify-between gap-3 px-5 py-3.5", i > 0 && "border-t")}>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-semibold wrap-break-word">
                        <bdi>{s.title}</bdi>
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {format.dateTime(s.startAt)} · {t(`sessions.status.${s.status}`)}
                      </span>
                    </div>
                    {evaluable && (
                      <Button variant="outline" size="sm" onClick={() => onEvaluation(s)}>
                        <ClipboardCheckIcon aria-hidden="true" data-icon="inline-start" />
                        {t("sessions.actions.myEvaluation")}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {pastShown > 0 && pastShown < agenda.past.length && (
            <Button variant="ghost" size="sm" onClick={() => setPastShown(pastShown + PAST_PAGE * 2)}>
              {t("sessions.student.showMore")}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

/** The next-session card on a student's home page, with a way to the full list. */
export function StudentNextSession({ canJoin }: { canJoin: boolean }) {
  const { t } = useI18n();
  const now = useNow();
  const list = useList<LiveSession>("/sessions");
  const { enter, joiningId } = useEnterSession();

  if (list.isPending) return <Skeleton className="h-56 rounded-3xl" />;
  const next = studentAgenda(list.data ?? [], now).next;
  return (
    <div className="space-y-2">
      {next ? <NextSessionCard session={next} now={now} onJoin={(s) => void enter(s)} joiningId={joiningId} canJoin={canJoin} /> : <NoneAhead />}
      <div className="flex justify-end">
        <Button asChild variant="link" className="px-1">
          <Link href="/dashboard/sessions">{t("sessions.student.allSessions")}</Link>
        </Button>
      </div>
    </div>
  );
}
