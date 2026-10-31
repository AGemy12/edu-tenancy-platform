"use client";

import { AlertTriangleIcon, ArrowLeftIcon, BookOpenCheckIcon, ClockIcon, GraduationCapIcon, StarIcon, TimerIcon, UserCheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-auth";
import { useReport } from "@/hooks/use-reports";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { getErrorMessage } from "@/lib/api";
import type { StudentReport } from "@/lib/types";
import { PdfButton, ReportToolbar } from "./report-toolbar";
import { AttendanceCalendar, AttendanceDonut, Delta, Empty, FlagBadges, Meter, OutcomeBadge, Panel, Tiles, TrendColumns, useReportFormat, type Tile } from "./report-ui";
import { useReportFilters } from "./use-report-filters";

/** One student's report: `id` is a student id, or "me" for the signed-in student. */
export function StudentReportView({ id }: { id: string }) {
  const { t, format } = useI18n();
  const f = useReportFormat();
  const { user } = useCurrentUser();
  const rf = useReportFilters();
  const isAdmin = user?.role === "TENANT_ADMIN";
  const self = id === "me";
  const path = `/reports/students/${id}`;
  const q = useReport<StudentReport>(rf.ready ? path : null, rf.query);
  const r = q.data;
  const s = r?.summary;

  const tiles: Tile[] = [
    {
      key: "rate",
      label: t("reports.attendanceRate"),
      value: s ? f.rate(s.attendanceRate) : null,
      icon: UserCheckIcon,
      tone: "bg-success/15 text-success",
      sub: s && (
        <>
          {t("reports.kpi.attendedOf", { a: format.number(s.counts.PRESENT + s.counts.LATE), n: format.number(s.counts.PRESENT + s.counts.LATE + s.counts.ABSENT) })}
          <Delta now={s.attendanceRate} before={r?.previous.attendanceRate} kind="rate" />
        </>
      ),
    },
    { key: "time", label: t("reports.kpi.attendedTime"), value: s ? f.duration(s.attendedMinutes) : null, icon: ClockIcon, tone: "bg-secondary text-secondary-foreground", sub: s && t("reports.kpi.ofHeld", { time: f.duration(s.heldMinutes) }) },
    {
      key: "punctuality",
      label: t("reports.kpi.punctuality"),
      value: s ? f.rate(s.punctualityRate) : null,
      icon: TimerIcon,
      tone: "bg-warning/20 text-warning-foreground dark:text-warning",
      sub: s && (s.counts.LATE ? t("reports.kpi.lateTimes", { count: s.counts.LATE }) : t("reports.kpi.neverLate")),
    },
    { key: "rating", label: t("reports.kpi.averageRating"), value: s ? f.rating(s.averageRating) : null, icon: StarIcon, tone: "bg-info/15 text-info", sub: s && <Delta now={s.averageRating} before={r?.previous.averageRating} kind="points" /> },
    {
      key: "exams",
      label: t("reports.kpi.examAverage"),
      value: s ? f.score(s.exams.average) : null,
      icon: GraduationCapIcon,
      tone: "bg-highlight/20 text-highlight-foreground dark:text-highlight",
      sub: s && (
        <>
          {t("reports.kpi.exams", { count: s.exams.count })}
          <Delta now={s.exams.average} before={r?.previous.examAverage} kind="points" />
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        {!self && (
          <Link href={`/dashboard/reports${rf.carry ? `?tab=students&${rf.carry}` : "?tab=students"}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t("reports.backToReports")}
          </Link>
        )}
        <h1 className="text-2xl font-bold md:text-3xl">{self ? t("reports.student.myTitle") : r ? <bdi>{r.student.name}</bdi> : t("reports.student.title")}</h1>
        <p className="text-muted-foreground">{t("reports.student.description")}</p>
      </div>

      <ReportToolbar filters={rf} showTeacher={isAdmin} showCourse={!self}>
        <PdfButton path={path} params={rf.query} finance={isAdmin} />
      </ReportToolbar>

      {q.isError ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertDescription>{getErrorMessage(q.error, t("reports.loadFailed"))}</AlertDescription>
        </Alert>
      ) : (
        <>
          {r && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border bg-card px-5 py-4 text-sm shadow-soft">
              <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-lg font-bold text-secondary-foreground">{[...r.student.name][0]}</span>
              <div className="min-w-0">
                <p className="text-base font-semibold">
                  <bdi>{r.student.name}</bdi>
                </p>
                <p className="text-muted-foreground" dir="ltr">
                  {r.student.email}
                </p>
              </div>
              {r.student.grade && <Fact label={t("reports.student.grade")} value={<bdi>{r.student.grade}</bdi>} />}
              {r.student.parentPhone && <Fact label={t("reports.student.parentPhone")} value={<span dir="ltr">{r.student.parentPhone}</span>} />}
              {r.student.teachers.length > 0 && (
                <Fact label={t("reports.student.teachers")} value={r.student.teachers.map((n, i) => <span key={n}>{i > 0 && t("reports.separator")}<bdi>{n}</bdi></span>)} />
              )}
              {r.student.status !== "ACTIVE" && <Badge variant="destructive">{t(`reports.accountStatus.${r.student.status}`)}</Badge>}
            </div>
          )}

          <Tiles tiles={tiles} loading={q.isPending} />

          {r && r.flags.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle className="flex flex-wrap items-center gap-2">
                {t("reports.student.needsAttention")}
                <FlagBadges flags={r.flags} />
              </AlertTitle>
              <AlertDescription>{t("reports.student.needsAttentionHint")}</AlertDescription>
            </Alert>
          )}

          {!r ? (
            <Skeleton className="h-80 rounded-2xl" />
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-5">
                <Panel title={t("reports.student.attendance")} description={t("reports.rateRule")} className="lg:col-span-2">
                  <AttendanceDonut counts={r.summary.counts} rate={r.summary.attendanceRate} />
                </Panel>
                <Panel title={r.period.days <= 62 ? t("reports.student.calendar") : t("reports.trend.title")} className="lg:col-span-3">
                  {r.period.days <= 62 ? <AttendanceCalendar from={r.period.from} to={r.period.to} days={r.days} /> : <TrendColumns trend={r.trend} />}
                </Panel>
              </div>

              {r.period.days > 14 && r.period.days <= 62 && r.trend.points.length > 1 && (
                <Panel title={t("reports.trend.title")} description={t(`reports.trend.by.${r.trend.unit}`)}>
                  <TrendColumns trend={r.trend} />
                </Panel>
              )}

              {r.courses.filter((c) => c.held > 0 || c.examAverage !== null).length > 1 && (
                <Panel title={t("reports.student.byCourse")}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>{t("reports.columns.course")}</TableHead>
                          <TableHead>{t("reports.columns.teacher")}</TableHead>
                          <TableHead>{t("reports.columns.held")}</TableHead>
                          <TableHead>{t("reports.outcome.ABSENT")}</TableHead>
                          <TableHead className="min-w-40">{t("reports.attendanceRate")}</TableHead>
                          <TableHead>{t("reports.columns.rating")}</TableHead>
                          <TableHead>{t("reports.columns.examAverage")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.courses
                          .filter((c) => c.held > 0 || c.examAverage !== null)
                          .map((c) => (
                            <TableRow key={c.id ?? "none"}>
                              <TableCell className="font-semibold">{c.title ? <bdi>{c.title}</bdi> : t("reports.noCourse")}</TableCell>
                              <TableCell>
                                <bdi>{c.teacher}</bdi>
                              </TableCell>
                              <TableCell className="tabular-nums">{format.number(c.held)}</TableCell>
                              <TableCell className="tabular-nums">{format.number(c.counts.ABSENT)}</TableCell>
                              <TableCell>
                                <Meter value={c.attendanceRate} label={f.rate(c.attendanceRate)} />
                              </TableCell>
                              <TableCell className="tabular-nums">{f.rating(c.averageRating)}</TableCell>
                              <TableCell className="tabular-nums">{f.score(c.examAverage)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </Panel>
              )}

              <Panel title={t("reports.student.sessions")} description={t("reports.sessionsCount", { count: r.sessions.length })}>
                {r.sessions.length === 0 ? (
                  <Empty>{t("reports.empty.sessions")}</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>{t("reports.columns.date")}</TableHead>
                          <TableHead>{t("reports.columns.session")}</TableHead>
                          <TableHead>{t("reports.columns.teacher")}</TableHead>
                          <TableHead>{t("reports.columns.attendance")}</TableHead>
                          <TableHead>{t("reports.columns.rating")}</TableHead>
                          <TableHead className="min-w-64">{t("reports.columns.notes")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.sessions.map((x) => (
                          <TableRow key={x.id}>
                            <TableCell className="whitespace-nowrap">
                              <span className="font-medium">{format.dayLong(x.startAt)}</span>
                              <span className="block text-xs text-muted-foreground tabular-nums">
                                {format.time(x.startAt)} · {f.duration(x.minutes)}
                              </span>
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
                              <bdi>{x.teacher.name}</bdi>
                            </TableCell>
                            <TableCell>
                              <OutcomeBadge outcome={x.outcome} />
                            </TableCell>
                            <TableCell className="tabular-nums">{x.rating === null ? "—" : f.rating(x.rating)}</TableCell>
                            <TableCell className="text-xs">
                              {!x.progress && !x.homework && !x.comment ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <div className="space-y-0.5">
                                  {x.progress && <Note label={t("reports.notes.progress")} text={x.progress} />}
                                  {x.homework && <Note label={t("reports.notes.homework")} text={x.homework} />}
                                  {x.comment && <Note label={t("reports.notes.comment")} text={x.comment} />}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Panel>

              <Panel title={t("reports.student.exams")} description={t("reports.student.examsHint")}>
                {r.exams.length === 0 ? (
                  <Empty>{t("reports.empty.exams")}</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>{t("reports.columns.exam")}</TableHead>
                          <TableHead>{t("reports.columns.course")}</TableHead>
                          <TableHead>{t("reports.columns.month")}</TableHead>
                          <TableHead>{t("reports.columns.score")}</TableHead>
                          <TableHead className="min-w-48">{t("reports.columns.percent")}</TableHead>
                          <TableHead>{t("reports.columns.feedback")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.exams.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-semibold">
                              <bdi>{e.title}</bdi>
                            </TableCell>
                            <TableCell>
                              <bdi>{e.course.title}</bdi>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{format.monthUtc(`${e.month}-01T00:00:00Z`)}</TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">{t("reports.outOf", { a: format.number(e.score), n: format.number(e.totalMarks) })}</TableCell>
                            <TableCell>
                              <Meter value={e.percent} max={100} label={f.score(e.percent)} marker={e.groupSize > 1 ? e.groupAverage : null} tone={e.percent < 50 ? "bg-outcome-absent" : undefined} />
                              {e.groupSize > 1 && <span className="text-xs text-muted-foreground">{t("reports.student.groupAverage", { avg: f.score(e.groupAverage), count: e.groupSize })}</span>}
                            </TableCell>
                            <TableCell>{e.feedback ? <bdi>{e.feedback}</bdi> : <span className="text-muted-foreground">—</span>}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Panel>

              {r.student.courses.length > 0 && (
                <Panel title={t("reports.student.enrollments")}>
                  <ul className="flex flex-wrap gap-2">
                    {r.student.courses.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                        <BookOpenCheckIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                        <bdi className="font-medium">{c.title}</bdi>
                        <span className="text-muted-foreground">
                          · <bdi>{c.teacher}</bdi>
                        </span>
                        {c.status !== "ACTIVE" && <Badge variant="outline">{t(`reports.enrollment.${c.status}`)}</Badge>}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Note({ label, text }: { label: string; text: string }) {
  return (
    <p>
      <span className="font-semibold">{label}:</span> <bdi className="text-muted-foreground">{text}</bdi>
    </p>
  );
}
