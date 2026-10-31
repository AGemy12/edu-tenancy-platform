"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDownIcon, FileDownIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadReportPdf, useReportOptions, type ReportParams } from "@/hooks/use-reports";
import { useI18n } from "@/i18n/provider";
import { PERIODS, type ReportFilters } from "./use-report-filters";

/** Radix Select can't hold an empty value, so "all" stands for no filter. */
const ALL = "__all";

/** Period, and (for staff) teacher and course, shared by every report; `children` go at the end of the row. */
export function ReportToolbar({
  filters: { filters, range, set },
  showTeacher,
  showCourse = true,
  children,
}: {
  filters: ReportFilters;
  showTeacher?: boolean;
  showCourse?: boolean;
  children?: ReactNode;
}) {
  const { t, format } = useI18n();
  const options = useReportOptions(Boolean(showTeacher || showCourse));
  const teachers = options.data?.teachers ?? [];
  const courses = (options.data?.courses ?? []).filter((c) => !filters.teacher || c.teacherId === filters.teacher);
  const day = (d: string) => `${d}T00:00:00Z`;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-period" className="text-xs text-muted-foreground">
          {t("reports.period.label")}
        </Label>
        <Select value={filters.period} onValueChange={(v) => set({ period: v === "thisMonth" ? null : v, ...(v === "custom" ? { from: range.from, to: range.to } : {}) })}>
          <SelectTrigger id="report-period" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`reports.period.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.period === "custom" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-from" className="text-xs text-muted-foreground">
              {t("reports.period.from")}
            </Label>
            <Input id="report-from" type="date" dir="ltr" className="w-40" value={range.from} max={range.to} onChange={(e) => e.target.value && set({ from: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-to" className="text-xs text-muted-foreground">
              {t("reports.period.to")}
            </Label>
            <Input id="report-to" type="date" dir="ltr" className="w-40" value={range.to} min={range.from} onChange={(e) => e.target.value && set({ to: e.target.value })} />
          </div>
        </>
      ) : (
        <p className="pb-2.5 text-sm text-muted-foreground tabular-nums">{format.dateRange(day(range.from), day(range.to))}</p>
      )}

      {showTeacher && (
        <FilterSelect
          id="report-teacher"
          label={t("reports.filters.teacher")}
          value={filters.teacher}
          onChange={(v) => set({ teacher: v, course: null })}
          options={teachers.map((x) => ({ value: x.id, label: x.name }))}
        />
      )}
      {showCourse && (
        <FilterSelect
          id="report-course"
          label={t("reports.filters.course")}
          value={filters.course}
          onChange={(v) => set({ course: v })}
          options={courses.map((x) => ({ value: x.id, label: x.title }))}
        />
      )}

      {children && <div className="ms-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-44 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
        <SelectTrigger id={id} className="w-full sm:w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("reports.filters.all")}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <bdi className="truncate">{o.label}</bdi>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Downloads the report as a branded PDF, in Arabic or English. `finance` adds an "include
 * charges" choice (admins on a student's report).
 */
export function PdfButton({ path, params, finance }: { path: string; params: ReportParams; finance?: boolean }) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [withFinance, setWithFinance] = useState(false);

  const download = async (lang: "ar" | "en") => {
    setBusy(true);
    try {
      await downloadReportPdf(path, { ...params, ...(finance && withFinance ? { finance: true } : {}) }, lang);
      toast.success(t("reports.pdf.ready"));
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("reports.pdf.failed"));
    } finally {
      setBusy(false);
    }
  };

  const other = locale === "ar" ? "en" : "ar";
  return (
    <div className="flex">
      <Button onClick={() => download(locale)} disabled={busy} className="rounded-e-none">
        {busy ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <FileDownIcon data-icon="inline-start" />}
        {busy ? t("reports.pdf.preparing") : t("reports.pdf.download")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={busy} className="rounded-s-none border-s border-primary-foreground/20 px-2" aria-label={t("reports.pdf.options")}>
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t("reports.pdf.language")}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => download(locale)}>{t(`reports.pdf.lang.${locale}`)}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => download(other)}>{t(`reports.pdf.lang.${other}`)}</DropdownMenuItem>
          {finance && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={withFinance} onCheckedChange={(v) => setWithFinance(v === true)} onSelect={(e) => e.preventDefault()}>
                {t("reports.pdf.includeFinance")}
              </DropdownMenuCheckboxItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
