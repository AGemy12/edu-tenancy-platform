"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheckIcon, Building2Icon, TrendingDownIcon, TrendingUpIcon, type LucideIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MrrMonth, PlatformMetrics } from "@/lib/types";

type Money = (n: number, signed?: boolean) => string;

/** The smallest round step × 10ⁿ at or above `n`, so the axis (top and half) reads in round numbers. */
function niceMax(n: number) {
  if (n <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(n));
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * p >= n) ?? 10) * p;
}

/** Super admin: MRR, paying centers, churn and trial conversion, with the MRR trend. */
export function SaasMetrics() {
  const { t, format } = useI18n();
  const q = useQuery({
    queryKey: ["platform", "metrics"],
    queryFn: async () => (await api.get<PlatformMetrics>("/platform/metrics")).data,
  });
  const data = q.data;
  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<"chart" | "table">("chart");
  const cur = data?.currencies.find((c) => c.currency === picked) ?? data?.currencies[0];
  const money: Money = (n, signed) => (cur ? format.money(n, cur.currency, signed) : format.number(n));
  const none = t("platform.metrics.noData");
  const trials = data?.trials;
  const decided = trials ? trials.converted + trials.lost : 0;

  const tiles: { icon: LucideIcon; tone: string; label: string; value?: string; sub?: string }[] = [
    {
      icon: TrendingUpIcon,
      tone: "bg-success/15 text-success",
      label: t("platform.metrics.mrr"),
      value: data && money(cur?.mrr ?? 0),
      sub: cur && t("platform.metrics.arr", { value: money(cur.arr) }),
    },
    {
      icon: Building2Icon,
      tone: "bg-secondary text-secondary-foreground",
      label: t("platform.metrics.paying"),
      value: data && format.number(cur?.paying ?? 0),
      sub: cur && cur.paying > 0 ? t("platform.metrics.arpa", { value: money(cur.arpa) }) : undefined,
    },
    {
      icon: TrendingDownIcon,
      tone: "bg-destructive/10 text-destructive",
      label: t("platform.metrics.churn"),
      value: data && (data.logos.churn === null ? none : format.percent(data.logos.churn)),
      sub:
        data &&
        (data.logos.churn === null
          ? t("platform.metrics.churnNone")
          : cur?.revenueChurn != null
            ? t("platform.metrics.churnSub", { percent: format.percent(cur.revenueChurn) })
            : undefined),
    },
    {
      icon: BadgeCheckIcon,
      tone: "bg-info/15 text-info",
      label: t("platform.metrics.trials"),
      value: trials && (trials.rate === null ? none : format.percent(trials.rate)),
      sub:
        trials &&
        (decided
          ? t("platform.metrics.trialsSub", { converted: format.number(trials.converted), decided: format.number(decided), days: format.number(trials.windowDays), open: format.number(trials.open) })
          : t("platform.metrics.trialsNone", { days: format.number(trials.windowDays) })),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>{t("platform.metrics.title")}</CardTitle>
          <CardDescription>{t("platform.metrics.description")}</CardDescription>
        </div>
        {data && data.currencies.length > 1 && cur && (
          <Select value={cur.currency} onValueChange={setPicked}>
            <SelectTrigger size="sm" className="w-28" aria-label={t("platform.metrics.currency")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.currencies.map((c) => (
                <SelectItem key={c.currency} value={c.currency}>
                  {c.currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {q.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(q.error, t("platform.metrics.loadFailed"))}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tile.tone)} aria-hidden="true">
                <tile.icon className="size-5" />
              </span>
              <div className="min-w-0">
                {tile.value === undefined ? (
                  <Skeleton className="mb-1 h-7 w-24" />
                ) : (
                  <p className="text-xl font-bold tabular-nums">
                    <bdi>{tile.value}</bdi>
                  </p>
                )}
                <p className="text-sm text-muted-foreground">{tile.label}</p>
                {tile.sub && <p className="text-xs text-muted-foreground tabular-nums">{tile.sub}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("platform.metrics.chartTitle")}</h3>
            <ToggleGroup type="single" variant="outline" size="sm" spacing={1} value={view} onValueChange={(v) => v && setView(v as "chart" | "table")}>
              <ToggleGroupItem value="chart" className="rounded-full px-3">
                {t("platform.metrics.view.chart")}
              </ToggleGroupItem>
              <ToggleGroupItem value="table" className="rounded-full px-3">
                {t("platform.metrics.view.table")}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {!data ? (
            <Skeleton className="h-56" />
          ) : !cur ? (
            <p className="grid h-40 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">{t("platform.metrics.empty")}</p>
          ) : view === "chart" ? (
            <MrrChart months={cur.months} money={money} />
          ) : (
            <MrrTable months={cur.months} money={money} />
          )}
          <p className="text-xs text-muted-foreground">{t("platform.metrics.note")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** One bar per month; hover or focus a month for what moved it. */
function MrrChart({ months, money }: { months: MrrMonth[]; money: Money }) {
  const { t, format } = useI18n();
  const top = niceMax(Math.max(...months.map((m) => m.mrr)));
  const ticks = [top, top / 2, 0];
  return (
    <figure aria-label={t("platform.metrics.chartTitle")}>
      <div className="flex gap-2">
        <div className="flex h-48 flex-col justify-between text-end text-[11px] text-muted-foreground tabular-nums" aria-hidden="true">
          {ticks.map((v) => (
            <span key={v} className="-my-1.5 leading-3">
              {format.compact(v)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-48">
            <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" aria-hidden="true" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 border-t border-border" aria-hidden="true" />
            <div className="absolute inset-0 flex items-end gap-1 sm:gap-2">
              {months.map((m) => (
                <Tooltip key={m.month}>
                  <TooltipTrigger asChild>
                    <div
                      tabIndex={0}
                      aria-label={`${format.monthUtc(m.month)}: ${money(m.mrr)}`}
                      className="flex h-full flex-1 items-end justify-center rounded-md outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="w-full max-w-9 rounded-t-lg bg-chart-1" style={{ height: `${(m.mrr / top) * 100}%` }} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="block max-w-none">
                    <MonthDetail month={m} money={money} />
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex gap-1 sm:gap-2" aria-hidden="true">
            {/* Phones label every third month, counted back from the current one. */}
            {months.map((m, i) => (
              <span
                key={m.month}
                className={cn(
                  "flex min-w-0 flex-1 justify-center whitespace-nowrap text-[11px] text-muted-foreground",
                  (months.length - 1 - i) % 3 !== 0 && "max-sm:invisible",
                )}
              >
                {format.monthShort(m.month)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

function MonthDetail({ month: m, money }: { month: MrrMonth; money: Money }) {
  const { t, format } = useI18n();
  const rows: [string, string][] = [
    [t("platform.metrics.columns.new"), money(m.new, true)],
    [t("platform.metrics.columns.expansion"), money(m.expansion, true)],
    [t("platform.metrics.columns.contraction"), money(-m.contraction, true)],
    [t("platform.metrics.columns.churned"), money(-m.churned, true)],
    [t("platform.metrics.columns.paying"), format.number(m.paying)],
  ];
  return (
    <div className="min-w-44 space-y-1 whitespace-nowrap">
      <p className="font-semibold">{format.monthUtc(m.month)}</p>
      <p className="text-sm font-bold tabular-nums">
        <bdi>{money(m.mrr)}</bdi>
      </p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 opacity-80">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>{k}</dt>
            <dd className="text-end tabular-nums">
              <bdi>{v}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function MrrTable({ months, money }: { months: MrrMonth[]; money: Money }) {
  const { t, format } = useI18n();
  const cols = ["start", "new", "expansion", "contraction", "churned", "mrr"] as const;
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("platform.metrics.columns.month")}</TableHead>
            {cols.map((c) => (
              <TableHead key={c} className="text-end">
                {t(`platform.metrics.columns.${c}`)}
              </TableHead>
            ))}
            <TableHead className="text-end">{t("platform.metrics.columns.paying")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...months].reverse().map((m) => (
            <TableRow key={m.month}>
              <TableCell className="whitespace-nowrap">{format.monthUtc(m.month)}</TableCell>
              {cols.map((c) => (
                <TableCell key={c} className={cn("text-end tabular-nums", c === "mrr" && "font-semibold", m[c] === 0 && c !== "mrr" && "text-muted-foreground")}>
                  <bdi>{money(m[c])}</bdi>
                </TableCell>
              ))}
              <TableCell className="text-end tabular-nums">{format.number(m.paying)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
