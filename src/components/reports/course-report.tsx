"use client";

import { AlertTriangleIcon, ArrowLeftIcon, CalendarCheck2Icon, ClockIcon, GraduationCapIcon, StarIcon, UserCheckIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReport } from "@/hooks/use-reports";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { getErrorMessage } from "@/lib/api";
import type { CourseReport } from "@/lib/types";
import { PdfButton, ReportToolbar } from "./report-toolbar";
import { Empty, FlagBadges, Meter, Panel, Tiles, TrendColumns, useReportFormat, type Tile } from "./report-ui";
import { ExamTable, studentHref } from "./teacher-report";
import { useReportFilters } from "./use-report-filters";

/** /dashboard/reports/course?id=… */
export function CourseReportView({ id }: { id: string }) {
  const { t, format } = useI18n();
  const f = useReportFormat();
  const rf = useReportFilters();
  const path = `/reports/courses/${id}`;
  const q = useReport<CourseReport>(rf.ready ? path : null, rf.query);
  const r = q.data;
  const s = r?.summary;

  const tiles: Tile[] = [
    { key: "held", label: t("reports.kpi.heldSessions"), value: s ? format.number(s.held) : null, icon: CalendarCheck2Icon, tone: "bg-info/15 text-info", sub: s && t("reports.kpi.heldSub", { canceled: format.number(s.canceled), missed: format.number(s.missed), upcoming: format.number(s.upcoming) }) },
    { key: "time", label: t("reports.kpi.teachingTime"), value: s ? f.duration(s.heldMinutes) : null, icon: ClockIcon, tone: "bg-secondary text-secondary-foreground" },
    { key: "rate", label: t("reports.attendanceRate"), value: s ? f.rate(s.attendanceRate) : null, icon: UserCheckIcon, tone: "bg-success/15 text-success", sub: s && t("reports.kpi.studentsCount", { count: s.students }) },
    { key: "rating", label: t("reports.kpi.averageRating"), value: s ? f.rating(s.averageRating) : null, icon: StarIcon, tone: "bg-warning/20 text-warning-foreground dark:text-warning" },
    { key: "exams", label: t("reports.kpi.examAverage"), value: s ? f.score(s.examAverage) : null, icon: GraduationCapIcon, tone: "bg-highlight/20 text-highlight-foreground dark:text-highlight", sub: s && t("reports.kpi.results", { count: s.examResults }) },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href={`/dashboard/reports?tab=courses${rf.carry ? `&${rf.carry}` : ""}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t("reports.backToReports")}
        </Link>
        <h1 className="text-2xl font-bold md:text-3xl">{r ? <bdi>{r.course.title}</bdi> : t("reports.course.title")}</h1>
        <p className="text-muted-foreground">
          {r ? (
            <>
              <bdi>{r.course.teacher.name}</bdi>
              {r.course.subject && (
                <>
                  {" · "}
                  <bdi>{r.course.subject}</bdi>
                </>
              )}
              {" · "}
              {t("reports.course.enrollments", { active: format.number(r.course.enrollments.active), completed: format.number(r.course.enrollments.completed), dropped: format.number(r.course.enrollments.dropped) })}
            </>
          ) : (
            t("reports.course.description")
          )}
        </p>
      </div>

      <ReportToolbar filters={rf} showCourse={false}>
        <PdfButton path={path} params={rf.query} />
      </ReportToolbar>

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
              {r.trend.points.length > 1 && (
                <Panel title={t("reports.trend.title")} description={t(`reports.trend.by.${r.trend.unit}`)}>
                  <TrendColumns trend={r.trend} />
                </Panel>
              )}

              <Panel title={t("reports.course.students")}>
                {r.students.length === 0 ? (
                  <Empty>{t("reports.empty.students")}</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>{t("reports.columns.student")}</TableHead>
                          <TableHead>{t("reports.columns.enrollment")}</TableHead>
                          <TableHead>{t("reports.columns.held")}</TableHead>
                          <TableHead>{t("reports.outcome.ABSENT")}</TableHead>
                          <TableHead className="min-w-40">{t("reports.attendanceRate")}</TableHead>
                          <TableHead>{t("reports.columns.rating")}</TableHead>
                          <TableHead>{t("reports.columns.examAverage")}</TableHead>
                          <TableHead>{t("reports.columns.followUp")}</TableHead>
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
                            <TableCell>
                              {x.enrollment ? (
                                <Badge variant={x.enrollment === "ACTIVE" ? "secondary" : "outline"}>{t(`reports.enrollment.${x.enrollment}`)}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">{t("reports.course.notEnrolled")}</span>
                              )}
                            </TableCell>
                            <TableCell className="tabular-nums">{format.number(x.held)}</TableCell>
                            <TableCell className="tabular-nums">{format.number(x.counts.ABSENT)}</TableCell>
                            <TableCell>
                              <Meter value={x.attendanceRate} label={f.rate(x.attendanceRate)} />
                            </TableCell>
                            <TableCell className="tabular-nums">{f.rating(x.averageRating)}</TableCell>
                            <TableCell className="tabular-nums">{f.score(x.examAverage)}</TableCell>
                            <TableCell>
                              <FlagBadges flags={x.flags} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Panel>

              <Panel title={t("reports.course.sessions")} description={t("reports.sessionsCount", { count: r.sessions.length })}>
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
                          <TableHead>{t("reports.outcome.PRESENT")}</TableHead>
                          <TableHead>{t("reports.outcome.LATE")}</TableHead>
                          <TableHead>{t("reports.outcome.ABSENT")}</TableHead>
                          <TableHead>{t("reports.outcome.EXCUSED")}</TableHead>
                          <TableHead className="min-w-40">{t("reports.attendanceRate")}</TableHead>
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
                              <bdi>{x.title}</bdi>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{t(`sessions.status.${x.status}`)}</Badge>
                            </TableCell>
                            <TableCell className="tabular-nums">{format.number(x.counts.PRESENT)}</TableCell>
                            <TableCell className="tabular-nums">{format.number(x.counts.LATE)}</TableCell>
                            <TableCell className="tabular-nums">{format.number(x.counts.ABSENT)}</TableCell>
                            <TableCell className="tabular-nums">{format.number(x.counts.EXCUSED)}</TableCell>
                            <TableCell>
                              <Meter value={x.attendanceRate} label={f.rate(x.attendanceRate)} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Panel>

              <Panel title={t("reports.exams.title")}>{r.exams.length === 0 ? <Empty>{t("reports.empty.exams")}</Empty> : <ExamTable exams={r.exams} />}</Panel>
            </>
          )}
        </>
      )}
    </div>
  );
}
