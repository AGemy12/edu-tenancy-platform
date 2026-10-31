"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangleIcon,
  BellRingIcon,
  CalendarCheck2Icon,
  ClipboardCheckIcon,
  ClockIcon,
  GaugeIcon,
  GraduationCapIcon,
  LandmarkIcon,
  ReceiptTextIcon,
  SearchIcon,
  StarIcon,
  TimerIcon,
  UserCheckIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RowActions } from "@/components/row-actions";
import { useCurrentUser } from "@/hooks/use-auth";
import { useReport } from "@/hooks/use-reports";
import { intlLocale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { getErrorMessage } from "@/lib/api";
import type { AlertsReport, CenterReport, CoursesReport, Outcome, RegisterReport, Role, StudentsReport, TeachersReport } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PdfButton, ReportToolbar } from "./report-toolbar";
import {
  Delta,
  Empty,
  FlagBadges,
  Meter,
  OUTCOME_FILL,
  Panel,
  Tiles,
  TrendColumns,
  rateTone,
  useReportFormat,
  type Tile,
} from "./report-ui";
import { StudentReportView } from "./student-report";
import { TeacherReportBody } from "./teacher-report";
import { useReportFilters, type ReportFilters } from "./use-report-filters";

const TABS = {
  TENANT_ADMIN: ["overview", "students", "register", "teachers", "courses", "alerts"],
  TEACHER: ["students", "register", "teachers", "courses", "alerts"],
} as const;
type Tab = (typeof TABS)["TENANT_ADMIN"][number];

const PDF_PATH: Partial<Record<Tab, string>> = { overview: "/reports/center", students: "/reports/students", register: "/reports/register" };

/** /dashboard/reports: the center's reports for staff, a student's own report for students. */
export function ReportsHub() {
  const { user } = useCurrentUser();
  if (!user) return <Skeleton className="h-96 rounded-2xl" />;
  if (user.role === "STUDENT") return <StudentReportView id="me" />;
  if (user.role !== "TENANT_ADMIN" && user.role !== "TEACHER") return null;
  return <StaffReports role={user.role} />;
}

function StaffReports({ role }: { role: Extract<Role, "TENANT_ADMIN" | "TEACHER"> }) {
  const { t } = useI18n();
  const params = useSearchParams();
  const rf = useReportFilters();
  const tabs = TABS[role] as readonly Tab[];
  const tab = (tabs as readonly string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as Tab) : tabs[0];
  const pdf = PDF_PATH[tab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t("reports.title")}</h1>
        <p className="text-muted-foreground">{t(role === "TEACHER" ? "reports.descriptionTeacher" : "reports.description")}</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => rf.set({ tab: v === tabs[0] ? null : v })}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            {tabs.map((x) => (
              <TabsTrigger key={x} value={x}>
                {t(role === "TEACHER" && x === "teachers" ? "reports.tabs.mine" : `reports.tabs.${x}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
          <ReportToolbar filters={rf} showTeacher={role === "TENANT_ADMIN" && tab !== "teachers"} showCourse={tab !== "courses"}>
            {pdf && <PdfButton path={pdf} params={rf.query} />}
          </ReportToolbar>
        </div>

        {rf.ready && (
          <>
            <TabsContent value="overview" className="mt-6">
              {tab === "overview" && <CenterOverview rf={rf} />}
            </TabsContent>
            <TabsContent value="students" className="mt-6">
              {tab === "students" && <StudentsTab rf={rf} />}
            </TabsContent>
            <TabsContent value="register" className="mt-6">
              {tab === "register" && <RegisterTab rf={rf} />}
            </TabsContent>
            <TabsContent value="teachers" className="mt-6">
              {tab === "teachers" && <TeachersTab rf={rf} role={role} />}
            </TabsContent>
            <TabsContent value="courses" className="mt-6">
              {tab === "courses" && <CoursesTab rf={rf} />}
            </TabsContent>
            <TabsContent value="alerts" className="mt-6">
              {tab === "alerts" && <AlertsTab rf={rf} />}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function LoadError({ error }: { error: unknown }) {
  const { t } = useI18n();
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertDescription>{getErrorMessage(error, t("reports.loadFailed"))}</AlertDescription>
    </Alert>
  );
}

const detailHref = (kind: "student" | "teacher" | "course", id: string, carry: string) => `/dashboard/reports/${kind}?id=${id}${carry ? `&${carry}` : ""}`;

// ───────── Overview (admins) ─────────

function CenterOverview({ rf }: { rf: ReportFilters }) {
  const { t, format } = useI18n();
  const f = useReportFormat();
  const q = useReport<CenterReport>("/reports/center", rf.query);
  const r = q.data;
  const k = r?.kpis;
  const p = r?.previousKpis;
  const money = (n: number | null | undefined) => (n == null || !r?.finance ? "—" : format.money(n, r.finance.currency));

  if (q.isError) return <LoadError error={q.error} />;
  const tiles: Tile[] = [
    { key: "active", label: t("reports.kpi.activeStudents"), value: k ? format.number(k.activeStudents) : null, icon: UsersIcon, tone: "bg-secondary text-secondary-foreground", sub: k && <>{t("reports.kpi.ofStudents", { n: format.number(k.students), added: format.number(k.newStudents) })}<Delta now={k.activeStudents} before={p?.activeStudents} kind="number" /></> },
    { key: "held", label: t("reports.kpi.heldSessions"), value: k ? format.number(k.held) : null, icon: CalendarCheck2Icon, tone: "bg-info/15 text-info", sub: k && t("reports.kpi.heldSub", { canceled: format.number(k.canceled), missed: format.number(k.missed), upcoming: format.number(k.upcoming) }) },
    { key: "time", label: t("reports.kpi.teachingTime"), value: k ? f.duration(k.heldMinutes) : null, icon: ClockIcon, tone: "bg-accent text-accent-foreground", sub: k && <Delta now={k.heldMinutes} before={p?.heldMinutes} kind="relative" /> },
    { key: "rate", label: t("reports.attendanceRate"), value: k ? f.rate(k.attendanceRate) : null, icon: UserCheckIcon, tone: "bg-success/15 text-success", sub: k && <Delta now={k.attendanceRate} before={p?.attendanceRate} kind="rate" /> },
    { key: "exams", label: t("reports.kpi.examAverage"), value: k ? f.score(k.examAverage) : null, icon: GraduationCapIcon, tone: "bg-highlight/20 text-highlight-foreground dark:text-highlight", sub: k && <Delta now={k.examAverage} before={p?.examAverage} kind="points" /> },
    { key: "rating", label: t("reports.kpi.averageRating"), value: k ? f.rating(k.averageRating) : null, icon: StarIcon, tone: "bg-warning/20 text-warning-foreground dark:text-warning", sub: k && <Delta now={k.averageRating} before={p?.averageRating} kind="points" /> },
    { key: "ontime", label: t("reports.kpi.onTime"), value: k ? f.rate(k.onTimeRate) : null, icon: TimerIcon, tone: "bg-info/15 text-info", sub: k && <Delta now={k.onTimeRate} before={p?.onTimeRate} kind="rate" /> },
    { key: "evaluated", label: t("reports.kpi.evaluations"), value: k ? f.rate(k.evaluationRate) : null, icon: ClipboardCheckIcon, tone: "bg-secondary text-secondary-foreground", sub: k && t("reports.kpi.evaluatedOf", { a: format.number(k.evaluated), n: format.number(k.evaluationsDue) }) },
    { key: "teachers", label: t("reports.kpi.activeTeachers"), value: k ? format.number(k.activeTeachers) : null, icon: GraduationCapIcon, tone: "bg-accent text-accent-foreground", sub: k && t("reports.kpi.ofTeachers", { n: format.number(k.teachers) }) },
    { key: "flagged", label: t("reports.kpi.flagged"), value: k ? format.number(k.flaggedStudents) : null, icon: BellRingIcon, tone: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="space-y-6">
      {r && <p className="text-sm text-muted-foreground">{t("reports.comparedWith", { period: format.dateRange(`${r.previous.from}T00:00:00Z`, `${r.previous.to}T00:00:00Z`) })}</p>}
      <Tiles tiles={tiles} loading={q.isPending} />

      {r?.finance && (
        <Panel title={t("reports.finance.title")} description={r.finance.missingRates ? t("reports.finance.missingRates", { count: r.finance.missingRates }) : t("reports.finance.description")}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { key: "fees", icon: ReceiptTextIcon, label: t("reports.finance.fees"), value: money(r.finance.fees), delta: <Delta now={r.finance.fees} before={r.previousFinance?.fees} kind="relative" /> },
              { key: "pay", icon: WalletIcon, label: t("reports.finance.teacherPay"), value: money(r.finance.teacherPay), delta: <Delta now={r.finance.teacherPay} before={r.previousFinance?.teacherPay} kind="relative" better="down" /> },
              { key: "platform", icon: GaugeIcon, label: t("reports.finance.platformFee"), value: money(r.finance.platformFee), delta: null },
              { key: "net", icon: LandmarkIcon, label: t("reports.finance.net"), value: money(r.finance.net), delta: <Delta now={r.finance.net} before={r.previousFinance?.net} kind="relative" /> },
            ].map((x) => (
              <div key={x.key} className="rounded-xl border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <x.icon className="size-4" aria-hidden="true" />
                  {x.label}
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  <bdi>{x.value}</bdi>
                </p>
                <div className="mt-1">{x.delta}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {r && r.trend.points.length > 1 && (
        <Panel title={t("reports.trend.title")} description={t(`reports.trend.by.${r.trend.unit}`)}>
          <TrendColumns trend={r.trend} />
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={t("reports.teachers.performance")}>
          {r && r.teachers.length === 0 ? (
            <Empty>{t("reports.empty.sessions")}</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("reports.columns.teacher")}</TableHead>
                  <TableHead>{t("reports.columns.held")}</TableHead>
                  <TableHead>{t("reports.columns.time")}</TableHead>
                  <TableHead>{t("reports.columns.onTime")}</TableHead>
                  <TableHead className="min-w-40">{t("reports.columns.attendance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(r?.teachers ?? []).map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="font-semibold">
                      <Link href={detailHref("teacher", x.id, rf.carry)} className="hover:underline">
                        <bdi>{x.name}</bdi>
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">{format.number(x.held)}</TableCell>
                    <TableCell className="tabular-nums">{f.duration(x.heldMinutes)}</TableCell>
                    <TableCell className="tabular-nums">{f.rate(x.onTimeRate)}</TableCell>
                    <TableCell>
                      <Meter value={x.attendanceRate} label={f.rate(x.attendanceRate)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        <Panel title={t("reports.alerts.students")} description={t("reports.alerts.studentsHint")}>
          {r && r.atRisk.length === 0 ? (
            <Empty>{t("reports.empty.risk")}</Empty>
          ) : (
            <ul className="divide-y">
              {(r?.atRisk ?? []).map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <Link href={detailHref("student", x.id, rf.carry)} className="font-semibold hover:underline">
                    <bdi>{x.name}</bdi>
                  </Link>
                  <FlagBadges flags={x.flags} />
                  <span className={cn("ms-auto text-sm font-semibold tabular-nums", rateTone(x.attendanceRate))}>{f.rate(x.attendanceRate)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ───────── Students ─────────

function StudentsTab({ rf }: { rf: ReportFilters }) {
  const { t, format } = useI18n();
  const f = useReportFormat();
  const q = useReport<StudentsReport>("/reports/students", rf.query);
  const [search, setSearch] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const r = q.data;
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (r?.students ?? []).filter((s) => (!term || s.name.toLowerCase().includes(term)) && (!onlyFlagged || s.flags.length > 0));
  }, [r, search, onlyFlagged]);

  if (q.isError) return <LoadError error={q.error} />;
  const s = r?.summary;
  const tiles: Tile[] = [
    { key: "students", label: t("reports.kpi.students"), value: s ? format.number(s.students) : null, icon: UsersIcon, tone: "bg-secondary text-secondary-foreground", sub: s && t("reports.kpi.activeInPeriod", { n: format.number(s.active) }) },
    { key: "rate", label: t("reports.attendanceRate"), value: s ? f.rate(s.attendanceRate) : null, icon: UserCheckIcon, tone: "bg-success/15 text-success", sub: s && t("reports.kpi.attendedOf", { a: format.number(s.counts.PRESENT + s.counts.LATE), n: format.number(s.counts.PRESENT + s.counts.LATE + s.counts.ABSENT) }) },
    { key: "rating", label: t("reports.kpi.averageRating"), value: s ? f.rating(s.averageRating) : null, icon: StarIcon, tone: "bg-warning/20 text-warning-foreground dark:text-warning" },
    { key: "exams", label: t("reports.kpi.examAverage"), value: s ? f.score(s.examAverage) : null, icon: GraduationCapIcon, tone: "bg-highlight/20 text-highlight-foreground dark:text-highlight" },
    { key: "flagged", label: t("reports.kpi.flagged"), value: s ? format.number(s.flagged) : null, icon: BellRingIcon, tone: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <Tiles tiles={tiles} loading={q.isPending} />
      <Panel
        title={t("reports.students.title")}
        description={t("reports.students.description")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge asChild variant={onlyFlagged ? "destructive" : "outline"} className="cursor-pointer">
              <button type="button" onClick={() => setOnlyFlagged((v) => !v)} aria-pressed={onlyFlagged}>
                {t("reports.students.onlyFlagged")}
              </button>
            </Badge>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input type="search" className="h-8 w-44 ps-8" placeholder={t("reports.students.search")} aria-label={t("reports.students.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        }
      >
        {q.isPending ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : rows.length === 0 ? (
          <Empty>{t("reports.empty.students")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("reports.columns.student")}</TableHead>
                  <TableHead>{t("reports.columns.held")}</TableHead>
                  <TableHead>{t("reports.outcome.PRESENT")}</TableHead>
                  <TableHead>{t("reports.outcome.LATE")}</TableHead>
                  <TableHead>{t("reports.outcome.ABSENT")}</TableHead>
                  <TableHead>{t("reports.outcome.EXCUSED")}</TableHead>
                  <TableHead className="min-w-40">{t("reports.attendanceRate")}</TableHead>
                  <TableHead>{t("reports.columns.rating")}</TableHead>
                  <TableHead>{t("reports.columns.examAverage")}</TableHead>
                  <TableHead>{t("reports.columns.followUp")}</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">{t("common.labels.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="font-semibold">
                      <Link href={detailHref("student", x.id, rf.carry)} className="hover:underline">
                        <bdi>{x.name}</bdi>
                      </Link>
                      {x.grade && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          <bdi>{x.grade}</bdi>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{format.number(x.held)}</TableCell>
                    <TableCell className="tabular-nums">{format.number(x.counts.PRESENT)}</TableCell>
                    <TableCell className="tabular-nums">{format.number(x.counts.LATE)}</TableCell>
                    <TableCell className="tabular-nums">{format.number(x.counts.ABSENT)}</TableCell>
                    <TableCell className="tabular-nums">{format.number(x.counts.EXCUSED)}</TableCell>
                    <TableCell>
                      <Meter value={x.attendanceRate} label={f.rate(x.attendanceRate)} />
                    </TableCell>
                    <TableCell className="tabular-nums">{f.rating(x.averageRating)}</TableCell>
                    <TableCell className="tabular-nums">{f.score(x.examAverage)}</TableCell>
                    <TableCell>
                      <FlagBadges flags={x.flags} />
                    </TableCell>
                    <TableCell>
                      <RowActions label={x.name} actions={[{ label: t("reports.actions.open"), href: detailHref("student", x.id, rf.carry) }]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ───────── Attendance register ─────────

const LETTER_TEXT: Partial<Record<Outcome, string>> = { UNRECORDED: "text-foreground", UPCOMING: "text-foreground", CANCELED: "text-muted-foreground", MISSED: "text-muted-foreground" };

function RegisterTab({ rf }: { rf: ReportFilters }) {
  const { t, format, locale } = useI18n();
  const f = useReportFormat();
  const q = useReport<RegisterReport>("/reports/register", rf.query);
  const r = q.data;
  const dayMonth = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" });

  if (q.isError) return <LoadError error={q.error} />;
  if (q.isPending || !r) return <Skeleton className="h-96 rounded-2xl" />;
  return (
    <Panel
      title={t("reports.register.title")}
      description={t("reports.register.description", { sessions: format.number(r.summary.sessions), students: format.number(r.summary.students), rate: f.rate(r.summary.attendanceRate) })}
    >
      {r.sessions.length === 0 ? (
        <Empty>{t("reports.empty.sessions")}</Empty>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky start-0 z-10 bg-muted px-3 py-2 text-start font-semibold">{t("reports.columns.student")}</th>
                  {r.sessions.map((s) => (
                    <th key={s.id} className="min-w-11 px-1 py-2 text-center text-[0.7rem] font-medium text-muted-foreground" title={`${s.title} · ${s.teacher.name}${s.course ? ` · ${s.course.title}` : ""}`}>
                      <span className="block font-semibold text-foreground tabular-nums">{dayMonth.format(new Date(`${s.day}T00:00:00Z`))}</span>
                      {format.weekday(new Date(`${s.day}T00:00:00Z`).getUTCDay(), "short")}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-semibold">{t("reports.columns.attended")}</th>
                  <th className="px-3 py-2 text-center font-semibold">{t("reports.outcome.ABSENT")}</th>
                  <th className="px-3 py-2 text-center font-semibold">{t("reports.attendanceRate")}</th>
                </tr>
              </thead>
              <tbody>
                {r.students.map((s) => (
                  <tr key={s.id} className="border-t">
                    <th scope="row" className="sticky start-0 z-10 bg-card px-3 py-2 text-start font-semibold whitespace-nowrap">
                      <Link href={detailHref("student", s.id, rf.carry)} className="hover:underline">
                        <bdi>{s.name}</bdi>
                      </Link>
                    </th>
                    {s.cells.map((o, i) => (
                      <td key={r.sessions[i].id} className="px-1 py-1.5 text-center">
                        {o ? (
                          <span
                            className={cn("inline-flex size-7 items-center justify-center rounded-md text-xs font-bold text-white", OUTCOME_FILL[o], LETTER_TEXT[o])}
                            title={t(`reports.outcome.${o}`)}
                          >
                            {t(`reports.letter.${o}`)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">·</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 text-center tabular-nums">{format.number(s.counts.PRESENT + s.counts.LATE)}</td>
                    <td className="px-3 text-center tabular-nums">{format.number(s.counts.ABSENT)}</td>
                    <td className={cn("px-3 text-center font-semibold tabular-nums", rateTone(s.attendanceRate))}>{f.rate(s.attendanceRate)}</td>
                  </tr>
                ))}
              </tbody>
              <TableFooter className="bg-muted/50">
                <tr className="border-t">
                  <th scope="row" className="sticky start-0 bg-muted px-3 py-2 text-start text-xs font-semibold">
                    {t("reports.register.present")}
                  </th>
                  {r.sessions.map((s) => (
                    <td key={s.id} className="px-1 py-2 text-center text-xs font-semibold tabular-nums">
                      {s.status === "COMPLETED" || s.status === "LIVE" ? format.number(s.counts.PRESENT + s.counts.LATE) : "—"}
                    </td>
                  ))}
                  <td colSpan={3} />
                </tr>
              </TableFooter>
            </table>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(["PRESENT", "LATE", "ABSENT", "EXCUSED", "UNRECORDED", "UPCOMING", "CANCELED"] as Outcome[]).map((o) => (
              <li key={o} className="flex items-center gap-1.5">
                <span className={cn("inline-flex size-5 items-center justify-center rounded text-[0.65rem] font-bold text-white", OUTCOME_FILL[o], LETTER_TEXT[o])}>{t(`reports.letter.${o}`)}</span>
                {t(`reports.outcome.${o}`)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

// ───────── Teachers ─────────

function TeachersTab({ rf, role }: { rf: ReportFilters; role: Role }) {
  const { t, format } = useI18n();
  const f = useReportFormat();
  const q = useReport<TeachersReport>("/reports/teachers", rf.query);
  const r = q.data;

  if (q.isError) return <LoadError error={q.error} />;
  if (q.isPending || !r) return <Skeleton className="h-96 rounded-2xl" />;
  // A teacher sees their own report here.
  if (role === "TEACHER" && r.teachers[0]) return <TeacherReportBody id={r.teachers[0].id} rf={rf} embedded />;
  return (
    <Panel title={t("reports.teachers.title")} description={t("reports.teachers.description")}>
      {r.teachers.length === 0 ? (
        <Empty>{t("reports.empty.teachers")}</Empty>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("reports.columns.teacher")}</TableHead>
                <TableHead>{t("reports.columns.held")}</TableHead>
                <TableHead>{t("reports.columns.time")}</TableHead>
                <TableHead>{t("reports.outcome.CANCELED")}</TableHead>
                <TableHead>{t("reports.outcome.MISSED")}</TableHead>
                <TableHead>{t("reports.columns.onTime")}</TableHead>
                <TableHead>{t("reports.columns.evaluations")}</TableHead>
                <TableHead className="min-w-40">{t("reports.columns.attendance")}</TableHead>
                <TableHead>{t("reports.columns.rating")}</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">{t("common.labels.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.teachers.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="font-semibold">
                    <Link href={detailHref("teacher", x.id, rf.carry)} className="hover:underline">
                      <bdi>{x.name}</bdi>
                    </Link>
                    <span className="block text-xs font-normal text-muted-foreground">{t("reports.teachers.linked", { n: format.number(x.linkedStudents) })}</span>
                  </TableCell>
                  <TableCell className="tabular-nums">{format.number(x.held)}</TableCell>
                  <TableCell className="tabular-nums">{f.duration(x.heldMinutes)}</TableCell>
                  <TableCell className="tabular-nums">{format.number(x.canceled)}</TableCell>
                  <TableCell className="tabular-nums">{format.number(x.missed)}</TableCell>
                  <TableCell className="tabular-nums">{f.rate(x.onTimeRate)}</TableCell>
                  <TableCell className={cn("tabular-nums", x.evaluationRate !== null && x.evaluationRate < 1 && "font-semibold text-destructive")}>{f.rate(x.evaluationRate)}</TableCell>
                  <TableCell>
                    <Meter value={x.attendanceRate} label={f.rate(x.attendanceRate)} />
                  </TableCell>
                  <TableCell className="tabular-nums">{f.rating(x.averageRating)}</TableCell>
                  <TableCell>
                    <RowActions label={x.name} actions={[{ label: t("reports.actions.open"), href: detailHref("teacher", x.id, rf.carry) }]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}

// ───────── Courses ─────────

function CoursesTab({ rf }: { rf: ReportFilters }) {
  const { t, format } = useI18n();
  const f = useReportFormat();
  const q = useReport<CoursesReport>("/reports/courses", rf.query);
  const r = q.data;

  if (q.isError) return <LoadError error={q.error} />;
  if (q.isPending || !r) return <Skeleton className="h-96 rounded-2xl" />;
  return (
    <Panel title={t("reports.courses.title")} description={t("reports.courses.description")}>
      {r.courses.length === 0 ? (
        <Empty>{t("reports.empty.courses")}</Empty>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("reports.columns.course")}</TableHead>
                <TableHead>{t("reports.columns.teacher")}</TableHead>
                <TableHead>{t("reports.columns.enrolled")}</TableHead>
                <TableHead>{t("reports.columns.held")}</TableHead>
                <TableHead>{t("reports.columns.time")}</TableHead>
                <TableHead className="min-w-40">{t("reports.columns.attendance")}</TableHead>
                <TableHead className="min-w-36">{t("reports.columns.examAverage")}</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">{t("common.labels.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">
                    <Link href={detailHref("course", c.id, rf.carry)} className="hover:underline">
                      <bdi>{c.title}</bdi>
                    </Link>
                    {!c.isActive && (
                      <Badge variant="outline" className="ms-2">
                        {t("reports.courses.inactive")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <bdi>{c.teacher.name}</bdi>
                  </TableCell>
                  <TableCell className="tabular-nums">{format.number(c.enrollments.active)}</TableCell>
                  <TableCell className="tabular-nums">{format.number(c.held)}</TableCell>
                  <TableCell className="tabular-nums">{f.duration(c.heldMinutes)}</TableCell>
                  <TableCell>
                    <Meter value={c.attendanceRate} label={f.rate(c.attendanceRate)} />
                  </TableCell>
                  <TableCell>
                    <Meter value={c.examAverage} max={100} label={f.score(c.examAverage)} />
                  </TableCell>
                  <TableCell>
                    <RowActions label={c.title} actions={[{ label: t("reports.actions.open"), href: detailHref("course", c.id, rf.carry) }]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}

// ───────── Alerts ─────────

function AlertsTab({ rf }: { rf: ReportFilters }) {
  const { t, format } = useI18n();
  const f = useReportFormat();
  const q = useReport<AlertsReport>("/reports/alerts", rf.query);
  const r = q.data;

  if (q.isError) return <LoadError error={q.error} />;
  if (q.isPending || !r) return <Skeleton className="h-96 rounded-2xl" />;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title={t("reports.alerts.students")} description={t("reports.alerts.studentsHint")}>
        {r.students.length === 0 ? (
          <Empty>{t("reports.empty.risk")}</Empty>
        ) : (
          <ul className="divide-y">
            {r.students.map((x) => (
              <li key={x.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={detailHref("student", x.id, rf.carry)} className="font-semibold hover:underline">
                    <bdi>{x.name}</bdi>
                  </Link>
                  <FlagBadges flags={x.flags} />
                </div>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  <span className={rateTone(x.attendanceRate)}>{t("reports.alerts.rate", { rate: f.rate(x.attendanceRate) })}</span>
                  <span>{t("reports.alerts.absent", { n: format.number(x.counts.ABSENT) })}</span>
                  {x.streak > 0 && <span>{t("reports.alerts.streak", { n: format.number(x.streak) })}</span>}
                  {x.examAverage !== null && <span>{t("reports.alerts.exams", { score: f.score(x.examAverage) })}</span>}
                  {x.averageRating !== null && <span>{t("reports.alerts.rating", { rating: f.rating(x.averageRating) })}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t("reports.alerts.unevaluated")} description={t("reports.alerts.unevaluatedHint")}>
        {r.unevaluated.length === 0 ? (
          <Empty>{t("reports.empty.unevaluated")}</Empty>
        ) : (
          <ul className="divide-y">
            {r.unevaluated.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    <bdi>{s.title}</bdi>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format.dateTime(s.startAt)} · <bdi>{s.teacher.name}</bdi>
                    {s.course && (
                      <>
                        {" · "}
                        <bdi>{s.course.title}</bdi>
                      </>
                    )}
                  </p>
                </div>
                <Badge variant="warning" className="ms-auto">
                  {t("reports.alerts.pending", { n: format.number(s.pending), total: format.number(s.students) })}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {r.unevaluated.length > 0 && (
          <Link href="/dashboard/sessions" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            {t("reports.alerts.goToSessions")}
          </Link>
        )}
      </Panel>
    </div>
  );
}
