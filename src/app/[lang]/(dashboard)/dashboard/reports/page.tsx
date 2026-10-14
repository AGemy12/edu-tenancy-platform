"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMonthlyReport } from "@/hooks/use-resources";
import { useI18n } from "@/i18n/provider";
import { getErrorMessage } from "@/lib/api";

function monthInput(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const { t, format } = useI18n();
  const [month, setMonth] = useState(monthInput());
  const report = useMonthlyReport(month);
  const rows = report.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t("reports.title")}</h1>
          <p className="text-muted-foreground">{t("reports.description")}</p>
        </div>
        <Input type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t("fields.month")} />
      </div>

      {report.isError && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(report.error, t("reports.loadFailed"))}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("reports.columns.student")}</TableHead>
                <TableHead>{t("reports.columns.sessions")}</TableHead>
                <TableHead>{t("reports.columns.attended")}</TableHead>
                <TableHead className="min-w-44">{t("reports.columns.attendanceRate")}</TableHead>
                <TableHead>{t("reports.columns.exams")}</TableHead>
                <TableHead>{t("reports.columns.averageScore")}</TableHead>
                <TableHead>{t("reports.columns.rating")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.isPending ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-14 text-center text-muted-foreground">
                    {t("reports.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const pct = Math.round(r.attendanceRate * 100);
                  return (
                    <TableRow key={r.studentId}>
                      <TableCell className="font-semibold">
                        <bdi>{r.studentName}</bdi>
                      </TableCell>
                      <TableCell className="tabular-nums">{format.number(r.sessionsTotal)}</TableCell>
                      <TableCell className="tabular-nums">
                        {format.number(r.sessionsAttended)}
                        {r.sessionsLate > 0 && (
                          <span className="ms-1.5 text-xs text-warning-foreground dark:text-warning">
                            ({t("reports.lateCount", { count: format.number(r.sessionsLate) })})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="w-10 text-sm tabular-nums">{format.number(pct)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{format.number(r.examsCount)}</TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {r.averageScore == null ? "—" : `${format.number(Math.round(r.averageScore))}%`}
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {r.averageRating == null
                          ? "—"
                          : t("reports.ratingValue", { rating: format.number(Math.round(r.averageRating * 10) / 10) })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
