"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PercentIcon, ReceiptTextIcon, WalletIcon, type LucideIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PlatformBilling } from "@/lib/types";

type Period = "thisMonth" | "lastMonth" | "thisYear";
const PERIODS: Period[] = ["thisMonth", "lastMonth", "thisYear"];

/** [from, to) in UTC months, so the whole month's sessions are in whatever the centers' zones. */
function rangeOf(period: Period) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const at = (year: number, month: number) => new Date(Date.UTC(year, month, 1)).toISOString();
  if (period === "thisYear") return { from: at(y, 0), to: at(y + 1, 0) };
  if (period === "lastMonth") return { from: at(y, m - 1), to: at(y, m) };
  return { from: at(y, m), to: at(y, m + 1) };
}

/** Super admin: subscriptions and session commissions per center, with totals per currency. */
export function PlatformEarnings({ onOpen }: { onOpen: (id: string) => void }) {
  const { t, format, locale } = useI18n();
  const [period, setPeriod] = useState<Period>("thisMonth");
  const range = useMemo(() => rangeOf(period), [period]);
  const q = useQuery({
    queryKey: ["platform", "billing", range],
    queryFn: async () => (await api.get<PlatformBilling>("/billing/platform", { params: range })).data,
    placeholderData: (prev) => prev,
  });
  const data = q.data;
  const money = (n: number, currency: string) => format.money(n, currency);
  const planName = (p: { nameAr: string; nameEn: string }) => (locale === "ar" ? p.nameAr : p.nameEn);

  // Active subscriptions by their package currency: what the platform bills every month.
  const subscriptions = useMemo(() => {
    const by = new Map<string, number>();
    for (const r of data?.tenants ?? []) {
      const sub = r.subscription;
      if (sub?.status === "ACTIVE" && !sub.expired && sub.plan.priceMonthly) by.set(sub.plan.currency, (by.get(sub.plan.currency) ?? 0) + sub.plan.priceMonthly);
    }
    return [...by.entries()];
  }, [data]);

  const tiles: { icon: LucideIcon; tone: string; label: string; lines?: string[]; sub?: string }[] = [
    {
      icon: PercentIcon,
      tone: "bg-success/15 text-success",
      label: t("platform.earnings.commission"),
      lines: data && (data.totals.length ? data.totals.map((x) => money(x.platformFee, x.currency)) : [money(0, "EGP")]),
      sub: data && data.totals.map((x) => t("platform.earnings.withFee", { withFee: format.number(x.withFee), centers: format.number(x.centers) })).join(" · "),
    },
    {
      icon: WalletIcon,
      tone: "bg-info/15 text-info",
      label: t("platform.earnings.subscriptions"),
      lines: data && (subscriptions.length ? subscriptions.map(([c, n]) => money(n, c)) : [money(0, "EGP")]),
    },
    {
      icon: ReceiptTextIcon,
      tone: "bg-accent text-accent-foreground",
      label: t("platform.earnings.fees"),
      lines: data && (data.totals.length ? data.totals.map((x) => money(x.fees, x.currency)) : [money(0, "EGP")]),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>{t("platform.earnings.title")}</CardTitle>
          <CardDescription>{t("platform.earnings.description")}</CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`platform.earnings.period.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(q.error, t("platform.earnings.loadFailed"))}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tile.tone)} aria-hidden="true">
                <tile.icon className="size-5" />
              </span>
              <div className="min-w-0">
                {tile.lines ? (
                  tile.lines.map((l) => (
                    <p key={l} className="text-xl font-bold tabular-nums" dir="ltr">
                      <bdi>{l}</bdi>
                    </p>
                  ))
                ) : (
                  <Skeleton className="mb-1 h-7 w-24" />
                )}
                <p className="text-sm text-muted-foreground">{tile.label}</p>
                {tile.sub && <p className="text-xs text-muted-foreground tabular-nums">{tile.sub}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("platform.earnings.columns.center")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("platform.earnings.columns.plan")}</TableHead>
                <TableHead>{t("platform.earnings.columns.fee")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("platform.earnings.columns.sessions")}</TableHead>
                <TableHead className="hidden text-end sm:table-cell">{t("platform.earnings.columns.fees")}</TableHead>
                <TableHead className="text-end">{t("platform.earnings.columns.commission")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.tenants.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    {t("platform.earnings.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                data.tenants.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
                    <TableCell>
                      <p className="font-medium">
                        <bdi>{r.name}</bdi>
                      </p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {r.slug}
                      </p>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {r.subscription ? (
                        <>
                          <bdi>{planName(r.subscription.plan)}</bdi>
                          {r.subscription.plan.priceMonthly ? (
                            <p className="text-xs text-muted-foreground tabular-nums" dir="ltr">
                              {money(r.subscription.plan.priceMonthly, r.subscription.plan.currency)}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">{t("platform.noPlan")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.platformFeePercent === null ? (
                        <Badge variant="secondary">{t("platform.noFee")}</Badge>
                      ) : (
                        <div className="space-y-0.5">
                          <Badge variant="outline" dir="ltr">
                            {t("platform.feePercent", { percent: format.number(r.platformFeePercent) })}
                          </Badge>
                          {r.platformFeeFromPlan && <p className="text-xs text-muted-foreground">{t("platform.feeFromPlan")}</p>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">{format.number(r.sessions)}</TableCell>
                    <TableCell className="hidden text-end tabular-nums sm:table-cell">
                      <bdi>{money(r.fees, r.currency)}</bdi>
                    </TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">
                      <bdi>{money(r.platformFee, r.currency)}</bdi>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
