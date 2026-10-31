"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  BanknoteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EyeIcon,
  HandCoinsIcon,
  InfoIcon,
  LandmarkIcon,
  PercentIcon,
  ReceiptTextIcon,
  TagsIcon,
  VideoIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RowActions } from "@/components/row-actions";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBillingOptions, useBillingSessions, useBillingSummary } from "@/hooks/use-billing";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { getErrorMessage } from "@/lib/api";
import type { BillingGroupBy, BillingSessionRow, BillingTotals, RateBasis, RateSource, Role, SessionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BillingFilters } from "./billing-filters";
import { GROUPS, SORTS, useBillingFilters } from "./use-billing-filters";

const STATUS_VARIANT: Record<SessionStatus, "info" | "success" | "secondary" | "destructive" | "warning"> = {
  SCHEDULED: "info",
  LIVE: "success",
  COMPLETED: "secondary",
  CANCELED: "destructive",
  MISSED: "warning",
};

type Viewer = "admin" | "teacher" | "student";
const viewerOf = (role: Role | undefined): Viewer => (role === "STUDENT" ? "student" : role === "TEACHER" ? "teacher" : "admin");

/** Groups each viewer can summarize by (a teacher has one teacher, a student one student). */
const GROUPS_FOR: Record<Viewer, BillingGroupBy[]> = {
  admin: GROUPS,
  teacher: ["student", "course", "month"],
  student: ["teacher", "course", "month"],
};

function useFormatters(currency: string) {
  const { t, format } = useI18n();
  const money = (n: number) => format.money(n, currency);
  const duration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return t("billing.duration.m", { m: format.number(m) });
    if (!m) return t("billing.duration.h", { h: format.number(h) });
    return t("billing.duration.hm", { h: format.number(h), m: format.number(m) });
  };
  const rate = (amount: number, basis: RateBasis) =>
    basis === "PERCENT"
      ? t("billing.percent", { percent: format.number(amount) })
      : t(basis === "PER_SESSION" ? "billing.perSession" : "billing.perHour", { amount: money(amount) });
  return { money, duration, rate };
}

export function BillingView() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const viewer = viewerOf(user?.role);
  const state = useBillingFilters();
  const { filters, set, query } = state;
  const options = useBillingOptions();
  const currency = options.data?.currency ?? "EGP";
  const list = useBillingSessions({ ...query, sort: filters.sort, page: filters.page });
  const groups = GROUPS_FOR[viewer];
  const groupBy = groups.includes(filters.group) ? filters.group : groups[0];
  const summary = useBillingSummary({ ...query, groupBy }, filters.view === "summary");
  const [details, setDetails] = useState<BillingSessionRow | null>(null);
  const totals = list.data?.totals;
  // The platform's commission on this center (admins only); null when none is set.
  const platformFeePercent = list.data?.platformFeePercent ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t("billing.title")}</h1>
          <p className="text-muted-foreground">{t(`billing.description.${viewer}`)}</p>
        </div>
        {viewer !== "student" && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/billing/rates">
                <TagsIcon data-icon="inline-start" /> {viewer === "admin" ? t("billing.managePrices") : t("billing.myPrices")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/billing/pay">
                <HandCoinsIcon data-icon="inline-start" /> {viewer === "admin" ? t("billing.managePay") : t("billing.myPay")}
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("billing.rule")}
        </p>
        {viewer !== "student" && list.data && (
          <p className="ps-6 font-medium text-foreground/80">
            {viewer === "admin" ? (platformFeePercent === null ? t("billing.formula.adminNoFee") : t("billing.formula.admin")) : t("billing.formula.teacher")}
          </p>
        )}
      </div>

      <BillingFilters {...state} role={user?.role ?? "STUDENT"} options={options.data} />

      <Kpis totals={totals} viewer={viewer} currency={currency} loading={list.isPending} platformFeePercent={platformFeePercent} />

      {totals && viewer !== "student" && <Notices totals={totals} viewer={viewer} filters={filters} onFilter={set} />}

      {list.isError && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(list.error, t("billing.loadFailed"))}</AlertDescription>
        </Alert>
      )}

      <Tabs value={filters.view} onValueChange={(v) => set({ view: v === "summary" ? "summary" : null })}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="sessions" className="px-4">
              {t("billing.tabs.sessions")}
            </TabsTrigger>
            <TabsTrigger value="summary" className="px-4">
              {t("billing.tabs.summary")}
            </TabsTrigger>
          </TabsList>

          {filters.view === "sessions" ? (
            <Select value={filters.sort} onValueChange={(v) => set({ sort: v === "date_desc" ? null : v })}>
              <SelectTrigger className="w-44" size="sm" aria-label={t("billing.sort.label")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`billing.sort.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground" id="billing-group-label">
                {t("billing.group.label")}
              </span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                aria-labelledby="billing-group-label"
                value={groupBy}
                onValueChange={(v) => v && set({ group: v })}
              >
                {groups.map((g) => (
                  <ToggleGroupItem key={g} value={g} className="px-3">
                    {t(`billing.group.${g}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}
        </div>

        <TabsContent value="sessions" className="mt-4">
          <SessionsTable
            rows={list.data?.rows}
            loading={list.isPending}
            filtered={state.activeCount > 0 || Boolean(filters.q)}
            viewer={viewer}
            currency={currency}
            showPlatformFee={platformFeePercent !== null}
            onDetails={setDetails}
          />
          {list.data && list.data.total > 0 && (
            <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={(page) => set({ page })} />
          )}
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <SummaryTable data={summary.data} loading={summary.isPending} viewer={viewer} currency={currency} showPlatformFee={platformFeePercent !== null} />
        </TabsContent>
      </Tabs>

      <DetailsDialog row={details} viewer={viewer} currency={currency} platformFeePercent={platformFeePercent} onClose={() => setDetails(null)} />
    </div>
  );
}

function Kpis({
  totals,
  viewer,
  currency,
  loading,
  platformFeePercent,
}: {
  totals?: BillingTotals;
  viewer: Viewer;
  currency: string;
  loading: boolean;
  platformFeePercent: number | null;
}) {
  const { t, format } = useI18n();
  const { money, duration } = useFormatters(currency);
  const tiles: { key: string; label: string; sub?: string; value: string | null; icon: typeof ClockIcon; tone: string }[] = [
    { key: "sessions", label: t("billing.kpi.sessions"), value: totals ? format.number(totals.chargedSessions) : null, icon: VideoIcon, tone: "bg-info/15 text-info" },
    viewer === "student"
      ? { key: "time", label: t("billing.kpi.studentTime"), value: totals ? duration(totals.studentMinutes) : null, icon: ClockIcon, tone: "bg-secondary text-secondary-foreground" }
      : { key: "time", label: t("billing.kpi.teachingTime"), value: totals ? duration(totals.minutes) : null, icon: ClockIcon, tone: "bg-secondary text-secondary-foreground" },
    {
      key: "fees",
      label: t(viewer === "student" ? "billing.kpi.studentFees" : viewer === "teacher" ? "billing.kpi.teacherFees" : "billing.kpi.fees"),
      value: totals ? money(totals.fees) : null,
      icon: ReceiptTextIcon,
      tone: "bg-accent text-accent-foreground",
    },
  ];
  if (viewer !== "student") {
    tiles.push({
      key: "pay",
      label: t(viewer === "teacher" ? "billing.kpi.myPay" : "billing.kpi.teacherPay"),
      value: totals?.teacherPay != null ? money(totals.teacherPay) : null,
      icon: HandCoinsIcon,
      tone: "bg-warning/20 text-warning-foreground dark:text-warning",
    });
  }
  if (viewer === "admin" && platformFeePercent !== null) {
    tiles.push({
      key: "platformFee",
      label: t("billing.kpi.platformFee"),
      sub: t("billing.kpi.platformFeeSub", { percent: format.number(platformFeePercent) }),
      value: totals?.platformFee != null ? money(totals.platformFee) : totals ? "—" : null,
      icon: PercentIcon,
      tone: "bg-destructive/10 text-destructive",
    });
  }
  if (viewer === "admin") {
    tiles.push({
      key: "net",
      label: t("billing.kpi.net"),
      value: totals?.net != null ? money(totals.net) : totals ? "—" : null,
      icon: LandmarkIcon,
      tone: "bg-success/15 text-success",
    });
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4",
        tiles.length === 6 ? "lg:grid-cols-3 xl:grid-cols-6" : tiles.length === 5 ? "lg:grid-cols-5" : tiles.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {tiles.map((tile) => (
        <Card key={tile.key}>
          <CardContent className="flex flex-col gap-2 pt-5 sm:gap-3 sm:pt-6">
            <span className={cn("flex size-9 items-center justify-center rounded-xl sm:size-11", tile.tone)}>
              <tile.icon className="size-5" aria-hidden="true" />
            </span>
            {loading || tile.value === null ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-xl font-bold tabular-nums sm:text-2xl" dir="ltr">
                <bdi>{tile.value}</bdi>
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {tile.label}
              {tile.sub && <span className="block text-xs tabular-nums">{tile.sub}</span>}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Notices({
  totals,
  viewer,
  filters,
  onFilter,
}: {
  totals: BillingTotals;
  viewer: Viewer;
  filters: ReturnType<typeof useBillingFilters>["filters"];
  onFilter: ReturnType<typeof useBillingFilters>["set"];
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2 empty:hidden">
      {totals.missingRates > 0 && !filters.missing && (
        <Alert className="border-warning/40 bg-warning/10">
          <AlertTriangleIcon className="text-warning-foreground dark:text-warning" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-foreground">
            {t("billing.alerts.missingRates", { count: totals.missingRates })}
            <Button size="sm" variant="outline" onClick={() => onFilter({ missing: true })}>
              {t("billing.alerts.show")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {totals.unconfirmed > 0 && filters.entry !== "unconfirmed" && (
        <Alert>
          <InfoIcon />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {t("billing.alerts.unconfirmed", { count: totals.unconfirmed })}
            <Button size="sm" variant="outline" onClick={() => onFilter({ entry: "unconfirmed" })}>
              {t("billing.alerts.show")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {viewer === "admin" && totals.net === undefined && (
        <p className="text-sm text-muted-foreground">{t("billing.alerts.netHidden")}</p>
      )}
    </div>
  );
}

/** Unconfirmed entries are an audit flag for staff; students just see the status. */
function StatusBadge({ row, viewer }: { row: BillingSessionRow; viewer: Viewer }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={STATUS_VARIANT[row.status]}>{t(`sessions.status.${row.status}`)}</Badge>
      {viewer !== "student" && row.billable && !row.confirmed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-warning-foreground dark:text-warning" tabIndex={0} aria-label={t("billing.unconfirmed")}>
              <AlertTriangleIcon className="size-4" aria-hidden="true" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">
            <p className="font-semibold">{t("billing.unconfirmed")}</p>
            <p>{t("billing.unconfirmedHint")}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function SessionsTable({
  rows,
  loading,
  filtered,
  viewer,
  currency,
  showPlatformFee,
  onDetails,
}: {
  rows?: BillingSessionRow[];
  loading: boolean;
  filtered: boolean;
  viewer: Viewer;
  currency: string;
  showPlatformFee: boolean;
  onDetails: (row: BillingSessionRow) => void;
}) {
  const { t, format } = useI18n();
  const { money, duration } = useFormatters(currency);
  const showNet = viewer === "admin" && rows?.some((r) => r.net !== undefined);
  const showFee = Boolean(showNet && showPlatformFee);
  const cols = [
    "date",
    "session",
    ...(viewer !== "teacher" ? ["teacher"] : []),
    ...(viewer !== "student" ? ["students"] : []),
    "duration",
    "status",
    "fees",
    ...(viewer !== "student" ? ["pay"] : []),
    ...(showFee ? ["platformFee"] : []),
    ...(showNet ? ["net"] : []),
    "actions",
  ];

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="hidden sm:table-cell">{t("billing.columns.date")}</TableHead>
              <TableHead>{t("billing.columns.session")}</TableHead>
              {viewer !== "teacher" && <TableHead className="hidden md:table-cell">{t("billing.columns.teacher")}</TableHead>}
              {viewer !== "student" && <TableHead className="hidden lg:table-cell">{t("billing.columns.students")}</TableHead>}
              <TableHead className="hidden sm:table-cell">{t("billing.columns.duration")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("billing.columns.status")}</TableHead>
              <TableHead className="text-end">{t(viewer === "student" ? "billing.columns.studentFee" : "billing.columns.fees")}</TableHead>
              {viewer !== "student" && (
                <TableHead className="text-end">{t(viewer === "teacher" ? "billing.columns.myPay" : "billing.columns.teacherPay")}</TableHead>
              )}
              {showFee && <TableHead className="hidden text-end xl:table-cell">{t("billing.columns.platformFee")}</TableHead>}
              {showNet && <TableHead className="hidden text-end xl:table-cell">{t("billing.columns.net")}</TableHead>}
              <TableHead className="w-14 text-center">{t("common.labels.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {cols.map((c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !rows?.length ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={cols.length} className="py-14 text-center text-muted-foreground">
                  {filtered ? t("billing.emptyFiltered") : t("billing.empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const missing = r.billable && r.students.some((s) => s.rate === null);
                return (
                  <TableRow key={r.id} className={cn(!r.billable && "text-muted-foreground")}>
                    <TableCell className="hidden whitespace-nowrap tabular-nums sm:table-cell">{format.dateTime(r.startAt)}</TableCell>
                    <TableCell className="max-w-56 min-w-36">
                      <div className="truncate font-semibold">
                        <bdi>{r.title}</bdi>
                      </div>
                      {r.course && (
                        <div className="truncate text-xs text-muted-foreground">
                          <bdi>{r.course.title}</bdi>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground tabular-nums sm:hidden">
                        {format.dateTime(r.startAt)}
                        {r.billable && <> · {duration(r.minutes)}</>}
                      </div>
                    </TableCell>
                    {viewer !== "teacher" && (
                      <TableCell className="hidden md:table-cell">
                        <bdi>{r.teacher.name}</bdi>
                      </TableCell>
                    )}
                    {viewer !== "student" && (
                      <TableCell className="hidden max-w-48 lg:table-cell">
                        <div className="text-sm">{t("billing.studentsCount", { count: r.students.length })}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          <bdi>{format.list(r.students.map((s) => s.name))}</bdi>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="hidden whitespace-nowrap sm:table-cell">
                      <div className="font-medium tabular-nums">{r.billable ? duration(r.minutes) : "—"}</div>
                      {r.actualMinutes !== null && (
                        <div className="text-xs text-muted-foreground tabular-nums">{t("billing.actual", { time: duration(r.actualMinutes) })}</div>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge row={r} viewer={viewer} />
                    </TableCell>
                    <TableCell className="text-end whitespace-nowrap">
                      {r.billable ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold tabular-nums">
                            <bdi>{money(r.fees)}</bdi>
                          </span>
                          {missing && <Badge variant="warning">{t("billing.noRate")}</Badge>}
                        </div>
                      ) : (
                        <span className="text-xs">{t("billing.notCharged")}</span>
                      )}
                    </TableCell>
                    {viewer !== "student" && (
                      <TableCell className="text-end whitespace-nowrap tabular-nums">
                        {r.teacherPay ? (
                          <bdi>{money(r.teacherPay.amount)}</bdi>
                        ) : r.billable ? (
                          <span className="text-xs text-muted-foreground">{t("billing.notSet")}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    {showFee && (
                      <TableCell className="hidden text-end whitespace-nowrap tabular-nums xl:table-cell">
                        {r.platformFee !== undefined && r.billable ? <bdi>{money(r.platformFee)}</bdi> : "—"}
                      </TableCell>
                    )}
                    {showNet && (
                      <TableCell className="hidden text-end whitespace-nowrap tabular-nums xl:table-cell">
                        {r.net !== undefined && r.billable ? <bdi>{money(r.net)}</bdi> : "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <RowActions
                        label={r.title}
                        actions={[{ label: t("billing.details.action"), icon: EyeIcon, onClick: () => onDetails(r) }]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const { t, format } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{t("billing.pagination.total", { count: total })}</span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeftIcon data-icon="inline-start" className="rtl:rotate-180" /> {t("billing.pagination.prev")}
          </Button>
          <span className="tabular-nums">{t("billing.pagination.info", { page: format.number(page), pages: format.number(pages) })}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            {t("billing.pagination.next")} <ChevronRightIcon data-icon="inline-end" className="rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}

function SummaryTable({
  data,
  loading,
  viewer,
  currency,
  showPlatformFee,
}: {
  data: ReturnType<typeof useBillingSummary>["data"];
  loading: boolean;
  viewer: Viewer;
  currency: string;
  showPlatformFee: boolean;
}) {
  const { t, format } = useI18n();
  const { money, duration } = useFormatters(currency);
  const groups = data?.groups ?? [];
  const showPay = groups.some((g) => g.teacherPay !== undefined);
  const showNet = groups.some((g) => g.net !== undefined);
  const showFee = showNet && showPlatformFee;
  const label = (g: (typeof groups)[number]) =>
    data?.groupBy === "month" ? format.month(`${g.key}-01T12:00:00`) : g.label ?? t("billing.group.noCourse");
  const sum = (pick: (g: (typeof groups)[number]) => number | undefined) => groups.reduce((a, g) => a + (pick(g) ?? 0), 0);
  const colCount = 4 + (showPay ? 1 : 0) + (showFee ? 1 : 0) + (showNet ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{data ? t(`billing.group.${data.groupBy}`) : t("billing.group.name")}</TableHead>
              <TableHead>{t("billing.columns.sessions")}</TableHead>
              <TableHead>{t("billing.columns.time")}</TableHead>
              <TableHead className="text-end">{t(viewer === "student" ? "billing.columns.studentFee" : "billing.columns.fees")}</TableHead>
              {showPay && (
                <TableHead className="text-end">{t(viewer === "teacher" ? "billing.columns.myPay" : "billing.columns.teacherPay")}</TableHead>
              )}
              {showFee && <TableHead className="text-end">{t("billing.columns.platformFee")}</TableHead>}
              {showNet && <TableHead className="text-end">{t("billing.columns.net")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: colCount }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : groups.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="py-14 text-center text-muted-foreground">
                  {t("billing.empty")}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g) => (
                <TableRow key={g.key}>
                  <TableCell className="font-semibold">
                    <bdi>{label(g)}</bdi>
                  </TableCell>
                  <TableCell className="tabular-nums">{format.number(g.sessions)}</TableCell>
                  <TableCell className="tabular-nums">{duration(g.minutes)}</TableCell>
                  <TableCell className="text-end font-semibold tabular-nums">
                    <bdi>{money(g.fees)}</bdi>
                  </TableCell>
                  {showPay && (
                    <TableCell className="text-end tabular-nums">
                      <bdi>{money(g.teacherPay ?? 0)}</bdi>
                    </TableCell>
                  )}
                  {showFee && (
                    <TableCell className="text-end tabular-nums">
                      <bdi>{money(g.platformFee ?? 0)}</bdi>
                    </TableCell>
                  )}
                  {showNet && (
                    <TableCell className="text-end tabular-nums">
                      <bdi>{money(g.net ?? 0)}</bdi>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && groups.length > 1 && (
            <TableFooter>
              <TableRow className="font-bold hover:bg-transparent">
                <TableCell>{t("billing.total")}</TableCell>
                <TableCell className="tabular-nums">{format.number(sum((g) => g.sessions))}</TableCell>
                <TableCell className="tabular-nums">{duration(sum((g) => g.minutes))}</TableCell>
                <TableCell className="text-end tabular-nums">
                  <bdi>{money(sum((g) => g.fees))}</bdi>
                </TableCell>
                {showPay && (
                  <TableCell className="text-end tabular-nums">
                    <bdi>{money(sum((g) => g.teacherPay))}</bdi>
                  </TableCell>
                )}
                {showFee && (
                  <TableCell className="text-end tabular-nums">
                    <bdi>{money(sum((g) => g.platformFee))}</bdi>
                  </TableCell>
                )}
                {showNet && (
                  <TableCell className="text-end tabular-nums">
                    <bdi>{money(sum((g) => g.net))}</bdi>
                  </TableCell>
                )}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}

function DetailsDialog({
  row,
  viewer,
  currency,
  platformFeePercent,
  onClose,
}: {
  row: BillingSessionRow | null;
  viewer: Viewer;
  currency: string;
  platformFeePercent: number | null;
  onClose: () => void;
}) {
  const { t, format } = useI18n();
  const { money, duration, rate } = useFormatters(currency);
  const sourceLabel = (s: RateSource) => t(`billing.source.${s}`);

  return (
    <Dialog open={row !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {row && (
          <>
            <DialogHeader>
              <DialogTitle>
                <bdi>{row.title}</bdi>
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="tabular-nums">{format.longDateTime(row.startAt)}</span>
                <span aria-hidden="true">·</span>
                <bdi>{row.teacher.name}</bdi>
                {row.course && (
                  <>
                    <span aria-hidden="true">·</span>
                    <bdi>{row.course.title}</bdi>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge row={row} viewer={viewer} />
              <Badge variant="outline">{t(`sessions.provider.${row.provider}`)}</Badge>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border px-4 py-3">
                <dt className="text-muted-foreground">{t("billing.details.booked")}</dt>
                <dd className="mt-1 font-semibold tabular-nums">{row.billable ? duration(row.minutes) : t("billing.notCharged")}</dd>
              </div>
              <div className="rounded-xl border px-4 py-3">
                <dt className="text-muted-foreground">{t("billing.details.actual")}</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {row.actualMinutes !== null ? duration(row.actualMinutes) : t("billing.details.notRecorded")}
                </dd>
              </div>
            </dl>

            <div className="max-h-72 overflow-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("billing.columns.students")}</TableHead>
                    <TableHead>{t("billing.columns.attendance")}</TableHead>
                    <TableHead>{t("billing.columns.rate")}</TableHead>
                    <TableHead className="text-end">{t(viewer === "student" ? "billing.columns.studentFee" : "billing.columns.fees")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {row.students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <bdi>{s.name}</bdi>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.attended ? "success" : "secondary"}>{s.attended ? t("billing.attended") : t("billing.absent")}</Badge>
                        {s.joinedAt && (
                          <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                            {t("billing.details.joinedAt", { time: format.time(s.joinedAt) })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.rate !== null && s.rateSource ? (
                          <>
                            <div className="tabular-nums">
                              <bdi>{rate(s.rate, s.rateBasis ?? "PER_HOUR")}</bdi>
                            </div>
                            <div className="text-xs text-muted-foreground">{sourceLabel(s.rateSource)}</div>
                          </>
                        ) : row.billable ? (
                          <Badge variant="warning">{t("billing.noRate")}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-end font-semibold tabular-nums">
                        <bdi>{money(s.fee)}</bdi>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <dl className="divide-y rounded-xl border text-sm">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <ReceiptTextIcon className="size-4" aria-hidden="true" /> {t("billing.details.charges")}
                </dt>
                <dd className="font-semibold tabular-nums">
                  <bdi>{money(row.fees)}</bdi>
                </dd>
              </div>
              {viewer !== "student" && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <HandCoinsIcon className="size-4" aria-hidden="true" /> {t("billing.details.teacherPay")}
                  </dt>
                  <dd className="text-end">
                    {row.teacherPay ? (
                      <>
                        <div className="font-semibold tabular-nums">
                          <bdi>{money(row.teacherPay.amount)}</bdi>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <bdi>{rate(row.teacherPay.rate, row.teacherPay.basis)}</bdi> · {sourceLabel(row.teacherPay.source)}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">{t("billing.details.payNotSet")}</span>
                    )}
                  </dd>
                </div>
              )}
              {row.platformFee !== undefined && platformFeePercent !== null && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <PercentIcon className="size-4" aria-hidden="true" /> {t("billing.details.platformFee")}
                  </dt>
                  <dd className="text-end">
                    <div className="font-semibold tabular-nums">
                      <bdi>{money(row.platformFee)}</bdi>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">{t("billing.kpi.platformFeeSub", { percent: format.number(platformFeePercent) })}</div>
                  </dd>
                </div>
              )}
              {row.net !== undefined && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <BanknoteIcon className="size-4" aria-hidden="true" /> {t("billing.kpi.net")}
                  </dt>
                  <dd className="font-bold tabular-nums">
                    <bdi>{money(row.net)}</bdi>
                  </dd>
                </div>
              )}
            </dl>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {t("common.actions.close")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
