"use client";

import { useEffect, useState } from "react";
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/i18n/provider";
import type { BillingOptions, Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PERIODS, PROVIDERS, STATUSES, type AdvancedKey, type useBillingFilters } from "./use-billing-filters";

type Props = ReturnType<typeof useBillingFilters> & { role: Role; options: BillingOptions | undefined };

/** Radix Select can't hold an empty value, so "all" stands for no filter. */
const ALL = "__all";

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
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("billing.filters.all")}</SelectItem>
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

export function BillingFilters({ filters, set, clear, range, activeCount, role, options }: Props) {
  const { t, format } = useI18n();
  const [open, setOpen] = useState(activeCount > 0);
  const [search, setSearch] = useState(filters.q);
  const isAdmin = role === "TENANT_ADMIN" || role === "SUPER_ADMIN";
  const isStudent = role === "STUDENT";

  // Typing updates the URL once the user pauses, not on every key.
  useEffect(() => {
    if (search.trim() === filters.q) return;
    const id = setTimeout(() => set({ q: search.trim() || null }), 350);
    return () => clearTimeout(id);
  }, [search, filters.q, set]);

  const teachers = (options?.teachers ?? []).map((x) => ({ value: x.id, label: x.name }));
  const students = (options?.students ?? []).map((x) => ({ value: x.id, label: x.name }));
  const courses = (options?.courses ?? [])
    .filter((c) => !filters.teacher || c.teacherId === filters.teacher)
    .map((x) => ({ value: x.id, label: x.title }));
  const showTeacher = isAdmin || (isStudent && teachers.length > 1);
  const showStudent = !isStudent;

  const lastDay = new Date(range.to.getTime() - 1);
  const nameOf = (list: { value: string; label: string }[], id: string) => list.find((o) => o.value === id)?.label ?? "…";

  const chips: { key: AdvancedKey; label: string; value: string }[] = [];
  if (filters.teacher) chips.push({ key: "teacher", label: t("billing.filters.teacher"), value: nameOf(teachers, filters.teacher) });
  if (filters.student) chips.push({ key: "student", label: t("billing.filters.student"), value: nameOf(students, filters.student) });
  if (filters.course) {
    const all = (options?.courses ?? []).map((x) => ({ value: x.id, label: x.title }));
    chips.push({ key: "course", label: t("billing.filters.course"), value: nameOf(all, filters.course) });
  }
  if (filters.provider) chips.push({ key: "provider", label: t("billing.filters.provider"), value: t(`sessions.provider.${filters.provider as "ZOOM"}`) });
  if (filters.status.length) {
    chips.push({ key: "status", label: t("billing.filters.status"), value: format.list(filters.status.map((s) => t(`sessions.status.${s}`))) });
  }
  if (filters.attendance) {
    chips.push({ key: "attendance", label: t("billing.filters.attendance"), value: t(`billing.filters.${filters.attendance as "attended" | "absent"}`) });
  }
  if (filters.entry) {
    chips.push({ key: "entry", label: t("billing.filters.entry"), value: t(`billing.filters.${filters.entry as "confirmed" | "unconfirmed"}`) });
  }
  if (filters.missing) chips.push({ key: "missing", label: t("billing.filters.missingRate"), value: "" });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="billing-period" className="text-xs text-muted-foreground">
            {t("billing.period.label")}
          </Label>
          <Select value={filters.period} onValueChange={(v) => set({ period: v })}>
            <SelectTrigger id="billing-period" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`billing.period.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filters.period === "custom" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="billing-from" className="text-xs text-muted-foreground">
                {t("billing.period.from")}
              </Label>
              <Input
                id="billing-from"
                type="date"
                dir="ltr"
                className="w-40"
                value={filters.from}
                max={filters.to}
                onChange={(e) => e.target.value && set({ from: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="billing-to" className="text-xs text-muted-foreground">
                {t("billing.period.to")}
              </Label>
              <Input
                id="billing-to"
                type="date"
                dir="ltr"
                className="w-40"
                value={filters.to}
                min={filters.from}
                onChange={(e) => e.target.value && set({ to: e.target.value })}
              />
            </div>
          </>
        ) : (
          <p className="pb-2.5 text-sm text-muted-foreground tabular-nums">
            {format.date(range.from)} – {format.date(lastDay)}
          </p>
        )}

        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            className="ps-9"
            placeholder={t("billing.search")}
            aria-label={t("billing.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button variant={open ? "secondary" : "outline"} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="billing-advanced">
          <SlidersHorizontalIcon data-icon="inline-start" />
          {t("billing.filters.advanced")}
          {activeCount > 0 && (
            <Badge className="ms-1 h-5 min-w-5 px-1.5 tabular-nums">
              {format.number(activeCount)}
            </Badge>
          )}
        </Button>
      </div>

      {open && (
        <div id="billing-advanced" className="grid gap-4 rounded-2xl border bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {showTeacher && (
            <FilterSelect
              id="billing-teacher"
              label={t("billing.filters.teacher")}
              value={filters.teacher}
              onChange={(v) => set({ teacher: v, course: null })}
              options={teachers}
            />
          )}
          {showStudent && (
            <FilterSelect id="billing-student" label={t("billing.filters.student")} value={filters.student} onChange={(v) => set({ student: v })} options={students} />
          )}
          <FilterSelect id="billing-course" label={t("billing.filters.course")} value={filters.course} onChange={(v) => set({ course: v })} options={courses} />
          <FilterSelect
            id="billing-provider"
            label={t("billing.filters.provider")}
            value={filters.provider}
            onChange={(v) => set({ provider: v })}
            options={PROVIDERS.map((p) => ({ value: p, label: t(`sessions.provider.${p}`) }))}
          />
          <FilterSelect
            id="billing-attendance"
            label={t("billing.filters.attendance")}
            value={filters.attendance}
            onChange={(v) => set({ attendance: v })}
            options={(["attended", "absent"] as const).map((v) => ({ value: v, label: t(`billing.filters.${v}`) }))}
          />
          <FilterSelect
            id="billing-entry"
            label={t("billing.filters.entry")}
            value={filters.entry}
            onChange={(v) => set({ entry: v })}
            options={(["confirmed", "unconfirmed"] as const).map((v) => ({ value: v, label: t(`billing.filters.${v}`) }))}
          />

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs text-muted-foreground" id="billing-status-label">
              {t("billing.filters.status")}
            </span>
            <ToggleGroup
              type="multiple"
              variant="outline"
              size="sm"
              spacing={1}
              className="flex-wrap"
              aria-labelledby="billing-status-label"
              value={filters.status}
              onValueChange={(v) => set({ status: v })}
            >
              {STATUSES.map((s) => (
                <ToggleGroupItem key={s} value={s} className="rounded-full px-3">
                  {t(`sessions.status.${s}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <span className="text-xs text-muted-foreground">{t("billing.filters.statusHint")}</span>
          </div>

          {!isStudent && (
            <div className="flex items-center gap-3 self-center sm:col-span-2">
              <Switch id="billing-missing" checked={filters.missing} onCheckedChange={(v) => set({ missing: v })} />
              <Label htmlFor="billing-missing">{t("billing.filters.missingRate")}</Label>
            </div>
          )}
        </div>
      )}

      {(chips.length > 0 || filters.q) && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <Badge key={c.key} variant="secondary" className="h-7 gap-1.5 pe-1 ps-3 text-xs font-medium">
              <span className={cn(c.value && "text-muted-foreground")}>{c.label}</span>
              {c.value && <bdi className="max-w-48 truncate font-semibold">{c.value}</bdi>}
              <button
                type="button"
                onClick={() => set({ [c.key]: null, ...(c.key === "teacher" ? { course: null } : {}) })}
                className="rounded-full p-0.5 hover:bg-background/60"
                aria-label={t("billing.filters.remove", { name: c.label })}
              >
                <XIcon className="size-3.5" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              clear();
            }}
          >
            {t("billing.filters.clear")}
          </Button>
        </div>
      )}
    </div>
  );
}
