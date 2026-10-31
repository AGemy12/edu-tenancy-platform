"use client";

import { AlertTriangleIcon, ArrowLeftIcon, CalendarCheck2Icon, CheckIcon, ClipboardCheckIcon, ClockIcon, TimerIcon, UserCheckIcon, WalletIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-auth";
import { useReport } from "@/hooks/use-reports";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { getErrorMessage } from "@/lib/api";
import type { ExamStats, SessionStatus, TeacherReport } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PdfButton, ReportToolbar } from "./report-toolbar";
import { Distribution, Empty, Meter, Panel, Tiles, TrendColumns, useReportFormat, type Tile } from "./report-ui";
import { useReportFilters, type ReportFilters } from "./use-report-filters";

const STATUS_VARIANT: Record<SessionStatus, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  COMPLETED: "success",
  LIVE: "warning",
  SCHEDULED: "secondary",
  CANCELED: "outline",
  MISSED: "destructive",
};

export const studentHref = (id: string, carry: string) => `/dashboard/reports/student?id=${id}${carry ? `&${carry}` : ""}`;

/** /dashboard/reports/teacher?id=… */
export function TeacherReportView({ id }: { id: string }) {
  const { t } = useI18n();
  const rf = useReportFilters();
  const q = useReport<TeacherReport>(rf.ready ? `/reports/teachers/${id}` : null, rf.query);
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href={`/dashboard/reports?tab=teachers${rf.carry ? `&${rf.carry}` : ""}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t("reports.backToReports")}
        </Link>
        <h1 className="text-2xl font-bold md:text-3xl">{q.data ? <bdi>{q.data.teacher.name}</bdi> : t("reports.teacher.title")}</h1>
        <p className="text-muted-foreground">{t("reports.teacher.description")}</p>
      </div>
      <TeacherReportBody id={id} rf={rf} />
    </div>
  );
}

/** The teacher's report under a toolbar; `embedded` when it sits inside the hub (which has its own toolbar). */
export function TeacherReportBody({ id, rf, embedded }: { id: string; rf: ReportFilters; embedded?: boolean }) {
  const { t, format } = useI18n();
  const f = useReportFormat();
  const { user } = useCurrentUser();
  const path = `/reports/teachers/${id}`;
  const q = useReport<TeacherReport>(rf.ready ? path : null, rf.query);
  const r = q.data;
  const s = r?.summary;

  const tiles: Tile[] = [
    { key: "held", label: t("reports.kpi.heldSessions"), value: s ? format.number(s.held) : null, icon: CalendarCheck2Icon, tone: "bg-info/15 text-info", sub: s && t("reports.kpi.heldSub", { canceled: format.number(s.canceled), missed: format.number(s.missed), upcoming: format.number(s.upcoming) }) },
    { key: "time", label: t("reports.kpi.teachingTime"), value: s ? f.duration(s.heldMinutes) : null, icon: ClockIcon, tone: "bg-secondary text-secondary-foreground", sub: s && s.actualMinutes !== null && t("reports.kpi.actual", { time: f.duration(s.actualMinutes) }) },
    {
      key: "ontime",
      label: t("reports.kpi.onTime"),
      value: s ? f.rate(s.onTimeRate) : null,
      icon: TimerIcon,
      tone: "bg-warning/20 text-warning-foreground dark:text-warning",
      sub: s && (s.averageDelay !== null ? t("reports.kpi.averageDelay", { m: format.number(s.averageDelay) }) : t("reports.kpi.startsRecorded", { n: format.number(s.startsRecorded) })),
    },
    { key: "evaluated", label: t("reports.kpi.evaluations"), value: s ? f.rate(s.evaluationRate) : null, icon: ClipboardCheckIcon, tone: "bg-accent text-accent-foreground", sub: s && t("reports.kpi.evaluatedOf", { a: format.number(s.evaluated), n: format.number(s.evaluationsDue) }) },
    { key: "attendance", label: t("reports.kpi.studentsAttendance"), value: s ? f.rate(s.attendanceRate) : null, icon: UserCheckIcon, tone: "bg-success/15 text-success", sub: s && t("reports.kpi.studentsAndRating", { n: format.number(s.students), rating: f.rating(s.averageRating) }) },
  ];

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex justify-end">
          <PdfButton path={path} params={rf.query} />
        </div>
      ) : (
        <ReportToolbar filters={rf} showCourse>
          <PdfButton path={path} params={rf.query} />
        </ReportToolbar>
      )}

      {q.isError ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertDescription>{getErrorMessage(q.error, t("reports.loadFailed"))}</AlertDescription>
        </Alert>
      ) : (
        <>
          <Tiles tiles={tiles} loading={q.isPending} />
          {!r ? (
            <Skeleton className="h-80 rounded-2xl" />
          ) : (
            <>
              {r.pay && (
                <Panel title={t("reports.teacher.pay")} description={t(user?.role === "TEACHER" ? "reports.teacher.payHintSelf" : "reports.teacher.payHint")}>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <Figure icon={CalendarCheck2Icon} label={t("reports.finance.chargedSessions")} value={format.number(r.pay.sessions)} />
                    <Figure icon={ClockIcon} label={t("reports.finance.chargedTime")} value={f.duration(r.pay.minutes)} />
                    <Figure icon={WalletIcon} label={t("reports.finance.teacherPay")} value={format.money(r.pay.teacherPay, r.pay.currency)} strong />
                    {r.pay.fees !== undefined && <Figure icon={WalletIcon} label={t("reports.finance.fees")} value={format.money(r.pay.fees, r.pay.currency)} />}
                  </div>
                </Panel>
              )}

              {r.trend.points.length > 1 && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <Panel title={t("reports.teacher.sessionsTrend")} description={t(`reports.trend.by.${r.trend.unit}`)}>
                    <TrendColumns trend={r.trend} mode="sessions" />
                  </Panel>
                  <Panel title={t("reports.trend.title")} description={t(`reports.trend.by.${r.trend.unit}`)}>
                    <TrendColumns trend={r.trend} />
                  </Panel>
                </div>
              )}

              <Panel title={t("reports.teacher.students")}>
                {r.students.length === 0 ? (
                  <Empty>{t("reports.empty.students")}</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>{t("reports.columns.student")}</TableHead>
                          <TableHead>{t("reports.columns.held")}</TableHead>
                          <TableHead>{t("reports.outcome.LATE")}</TableHead>
                          <TableHead>{t("reports.outcome.ABSENT")}</TableHead>
                          <TableHead>{t("reports.outcome.EXCUSED")}</TableHead>
                          <TableHead className="min-w-40">{t("reports.attendanceRate")}</TableHead>
                          <TableHead>{t("reports.columns.rating")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.students.map((x) => (
                          <TableRow key={x.id}>
                            <TableCell className="font-semibold">
                              <Link href={studentHref(x.id, rf.carry)} className="hover:underline">
                                <bdi>{x.name}</bdi>
                              </Link>
                            </TableCell>
                            <TableCell className="tabular-nums">{format.number(x.held)}</TableCell>
                            <TableCell className="tabular-nums">{format.number(x.counts.LATE)}</TableCell>
                            <TableCell className="tabular-nums">{format.number(x.counts.ABSENT)}</TableCell>
                            <TableCell className="tabular-nums">{format.number(x.counts.EXCUSED)}</TableCell>
                            <TableCell>
                              <Meter value={x.attendanceRate} label={f.rate(x.attendanceRate)} />
                            </TableCell>
                            <TableCell className="tabular-nums">{f.rating(x.averageRating)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Panel>

              <Panel title={t("reports.teacher.sessions")} description={t("reports.sessionsCount", { count: r.sessions.length })}>
                {r.sessions.length === 0 ? (
                  <Empty>{t("reports.empty.sessions")}</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>{t("reports.columns.date")}</TableHead>
                          <TableHead>{t("reports.columns.session")}</TableHead>
                          <TableHead>{t("reports.columns.status")}</TableHead>
                          <TableHead>{t("reports.columns.time")}</TableHead>
                          <TableHead>{t("reports.columns.start")}</TableHead>
                          <TableHead>{t("reports.columns.attended")}</TableHead>
                          <TableHead>{t("reports.columns.evaluation")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.sessions.map((x) => (
                          <TableRow key={x.id}>
                            <TableCell className="whitespace-nowrap">
                              <span className="font-medium">{format.dayLong(x.startAt)}</span>
                              <span className="block text-xs text-muted-foreground tabular-nums">{format.time(x.startAt)}</span>
                            </TableCell>
                            <TableCell>
                              <bdi className="font-medium">{x.title}</bdi>
                              {x.course && (
                                <span className="block text-xs text-muted-foreground">
                                  <bdi>{x.course.title}</bdi>
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_VARIANT[x.status]}>{t(`sessions.status.${x.status}`)}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {f.duration(x.minutes)}
                              {x.actualMinutes !== null && <span className="block text-xs text-muted-foreground">{t("reports.kpi.actual", { time: f.duration(x.actualMinutes) })}</span>}
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {x.delay === null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : x.delay <= 5 ? (
                                <span className="text-success">{t("reports.teacher.onTime")}</span>
                              ) : (
                                <span className="text-warning-foreground dark:text-warning">{t("reports.teacher.late", { m: format.number(x.delay) })}</span>
                              )}
                            </TableCell>
                            <TableCell className="tabular-nums">{x.students && (x.status === "COMPLETED" || x.status === "LIVE") ? t("reports.outOf", { a: format.number(x.counts.PRESENT + x.counts.LATE), n: format.number(x.students) }) : "—"}</TableCell>
                            <TableCell>
                              {x.evaluated === null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : x.evaluated ? (
                                <CheckIcon className="size-4 text-success" aria-label={t("reports.teacher.evaluated")} />
                              ) : (
                                <Badge variant="warning">{t("reports.teacher.pending")}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Panel>

              {r.exams.length > 0 && (
                <Panel title={t("reports.exams.title")}>
                  <ExamTable exams={r.exams} />
                </Panel>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Figure({ icon: Icon, label, value, strong }: { icon: typeof ClockIcon; label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", strong && "text-success")}>
        <bdi>{value}</bdi>
      </p>
    </div>
  );
}

/** Exams with their averages, extremes and score bands. */
export function ExamTable({ exams }: { exams: ExamStats[] }) {
  const { t, format } = useI18n();
  const f = useReportFormat();
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("reports.columns.exam")}</TableHead>
              <TableHead>{t("reports.columns.course")}</TableHead>
              <TableHead>{t("reports.columns.month")}</TableHead>
              <TableHead>{t("reports.columns.results")}</TableHead>
              <TableHead className="min-w-40">{t("reports.columns.average")}</TableHead>
              <TableHead>{t("reports.columns.range")}</TableHead>
              <TableHead className="min-w-32">{t("reports.columns.distribution")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-semibold">
                  <bdi>{e.title}</bdi>
                </TableCell>
                <TableCell>
                  <bdi>{e.course.title}</bdi>
                </TableCell>
                <TableCell className="whitespace-nowrap">{format.monthUtc(`${e.month}-01T00:00:00Z`)}</TableCell>
                <TableCell className="tabular-nums">{format.number(e.results)}</TableCell>
                <TableCell>
                  <Meter value={e.average} max={100} label={f.score(e.average)} />
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{e.lowest === null ? "—" : t("reports.exams.range", { low: f.score(e.lowest), high: f.score(e.highest) })}</TableCell>
                <TableCell>
                  <Distribution bands={e.distribution} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(["bg-outcome-absent", "bg-outcome-late", "bg-chart-5", "bg-chart-1", "bg-outcome-present"] as const).map((c, i) => (
          <li key={c} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", c)} aria-hidden="true" />
            {t(`reports.bands.b${i as 0 | 1 | 2 | 3 | 4}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
