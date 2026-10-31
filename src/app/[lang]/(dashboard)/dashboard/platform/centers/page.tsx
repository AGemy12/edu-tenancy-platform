"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CirclePauseIcon, CirclePlayIcon, CreditCardIcon, EyeIcon, LifeBuoyIcon, PercentIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import CreateTenantDialog from "@/components/platform/create-tenant-dialog";
import PlatformFeeDialog, { type PlatformFeeTarget } from "@/components/platform/platform-fee-dialog";
import SubscriptionDialog from "@/components/platform/subscription-dialog";
import SupportDialog, { type SupportTarget } from "@/components/platform/support-dialog";
import TenantSheet from "@/components/platform/tenant-sheet";
import { RowActions, type RowAction } from "@/components/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useList } from "@/hooks/use-resources";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { formatBytes } from "@/lib/library";
import { cn } from "@/lib/utils";
import type { PlatformTenant, SubscriptionStatus } from "@/lib/types";

const SUB_TONE: Record<SubscriptionStatus, "success" | "info" | "warning" | "destructive"> = {
  ACTIVE: "success",
  TRIALING: "info",
  PAST_DUE: "warning",
  CANCELED: "destructive",
};
type Filter = "all" | "active" | "trialing" | "expired" | "suspended";
const FILTERS: Filter[] = ["all", "active", "trialing", "expired", "suspended"];
const isFilter = (v: string): v is Filter => (FILTERS as string[]).includes(v);

/** Super admin: every center, searchable and filterable; details, subscription and suspension per row. */
export default function PlatformCentersPage() {
  const { t, format, locale } = useI18n();
  const qc = useQueryClient();
  const tenants = useList<PlatformTenant>("/tenants");
  const [managing, setManaging] = useState<PlatformTenant | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [fee, setFee] = useState<PlatformFeeTarget | null>(null);
  const [creating, setCreating] = useState(false);
  const [support, setSupport] = useState<SupportTarget | null>(null);
  // Ticked rows: the targets (or the exceptions) of a bulk commission.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  // The home page's tiles link here with the filter in the hash (#expired). This page only renders
  // on the client (behind the signed-in layout), so reading the hash at mount is safe.
  const [filter, setFilter] = useState<Filter>(() => {
    const h = typeof window === "undefined" ? "" : window.location.hash.slice(1);
    return isFilter(h) ? h : "all";
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PlatformTenant["status"] }) => api.patch(`/tenants/${id}/status`, { status }),
    onSuccess: (_res, v) => {
      toast.success(v.status === "SUSPENDED" ? t("platform.toast.suspended") : t("platform.toast.activated"));
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.updateFailed"))),
  });

  const rows = tenants.data;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      const hit = !q || r.name.toLowerCase().includes(q) || r.slug.includes(q) || r.owner?.email.toLowerCase().includes(q) || r.owner?.fullName.toLowerCase().includes(q);
      if (!hit) return false;
      switch (filter) {
        case "active":
          return r.status === "ACTIVE" && r.subscription?.status === "ACTIVE" && !r.subscriptionExpired;
        case "trialing":
          return r.subscription?.status === "TRIALING" && !r.subscriptionExpired;
        case "expired":
          return r.subscriptionExpired || r.subscription?.status === "PAST_DUE" || r.subscription?.status === "CANCELED";
        case "suspended":
          return r.status === "SUSPENDED";
        default:
          return true;
      }
    });
  }, [rows, query, filter]);

  const selectedRows = (rows ?? []).filter((r) => selected.has(r.id));
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const someShownSelected = shown.some((r) => selected.has(r.id));
  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function toggleShown(on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of shown) {
        if (on) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });
  }

  const actionsFor = (r: PlatformTenant): RowAction[] => [
    { label: t("platform.actions.details"), icon: EyeIcon, onClick: () => setViewing(r.id) },
    { label: t("platform.actions.subscription"), icon: CreditCardIcon, onClick: () => setManaging(r) },
    { label: t("platform.actions.fee"), icon: PercentIcon, onClick: () => setFee({ kind: "single", tenant: r }) },
    ...(r.status === "ACTIVE" ? [{ label: t("support.requestAsOwner"), icon: LifeBuoyIcon, onClick: () => setSupport({ tenantId: r.id, tenantName: r.name }) }] : []),
    r.status === "ACTIVE"
      ? { label: t("platform.actions.suspend"), icon: CirclePauseIcon, variant: "destructive", separatorBefore: true, onClick: () => setStatus.mutate({ id: r.id, status: "SUSPENDED" }) }
      : { label: t("platform.actions.activate"), icon: CirclePlayIcon, separatorBefore: true, onClick: () => setStatus.mutate({ id: r.id, status: "ACTIVE" }) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t("platform.title")}</h1>
          <p className="text-muted-foreground">{t("platform.description")}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon data-icon="inline-start" /> {t("platform.create.button")}
        </Button>
      </div>

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <h2 className="text-lg font-bold">{t("platform.centers.title")}</h2>
          <span className="text-sm text-muted-foreground tabular-nums">{rows && t("platform.centers.shown", { shown: format.number(shown.length), total: format.number(rows.length) })}</span>
          <div className="relative ms-auto w-full sm:max-w-xs">
            <SearchIcon className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("platform.centers.search")} className="h-9 ps-9" aria-label={t("platform.centers.search")} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2.5" role="group">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {t(`platform.centers.filters.${f}`)}
            </button>
          ))}
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {selected.size > 0 && (
              <>
                <span className="text-xs text-muted-foreground tabular-nums">{t("platform.fee.selected", { count: selected.size })}</span>
                <Button variant="ghost" size="xs" onClick={() => setSelected(new Set())}>
                  <XIcon data-icon="inline-start" /> {t("platform.fee.clearSelection")}
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setFee({ kind: "bulk", selected: selectedRows })} disabled={!rows?.length}>
              <PercentIcon data-icon="inline-start" /> {t("platform.fee.bulk")}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allShownSelected ? true : someShownSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleShown(v === true)}
                    aria-label={t("platform.fee.selectAll")}
                    disabled={shown.length === 0}
                  />
                </TableHead>
                <TableHead>{t("platform.columns.center")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("platform.columns.owner")}</TableHead>
                <TableHead>{t("platform.columns.plan")}</TableHead>
                <TableHead>{t("platform.columns.subscription")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("platform.columns.fee")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("platform.columns.members")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("platform.columns.storage")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("platform.columns.createdAt")}</TableHead>
                <TableHead>{t("platform.columns.status")}</TableHead>
                <TableHead className="w-14 text-center">{t("common.labels.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.isPending ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : shown.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={11} className="py-12 text-center text-sm text-muted-foreground">
                    {rows?.length ? t("platform.centers.noResults") : t("platform.emptyTitle")}
                  </TableCell>
                </TableRow>
              ) : (
                shown.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" data-state={selected.has(r.id) ? "selected" : undefined} onClick={() => setViewing(r.id)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={(v) => toggle(r.id, v === true)} aria-label={t("platform.fee.selectRow", { name: r.name })} />
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">
                        <bdi>{r.name}</bdi>
                      </p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {r.slug}
                      </p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {r.owner ? (
                        <>
                          <p className="truncate">
                            <bdi>{r.owner.fullName}</bdi>
                          </p>
                          <p className="truncate text-xs text-muted-foreground" dir="ltr">
                            {r.owner.email}
                          </p>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{t("platform.noOwner")}</span>
                      )}
                    </TableCell>
                    <TableCell>{r.subscription ? <bdi>{locale === "ar" ? r.subscription.plan.nameAr : r.subscription.plan.nameEn}</bdi> : <span className="text-muted-foreground">{t("platform.noPlan")}</span>}</TableCell>
                    <TableCell>
                      {r.subscription ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={SUB_TONE[r.subscription.status]}>{t(`platform.subscriptionStatus.${r.subscription.status}`)}</Badge>
                            {r.subscriptionExpired && <Badge variant="destructive">{t("platform.expired")}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {r.subscription.currentPeriodEnd ? `${t("platform.columns.periodEnd")} ${format.date(r.subscription.currentPeriodEnd)}` : t("platform.unlimited")}
                          </p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {r.platformFeePercent === null ? (
                        <span className="text-xs text-muted-foreground">{t("platform.noFee")}</span>
                      ) : (
                        <Badge variant="outline" dir="ltr">
                          {t("platform.feePercent", { percent: format.number(r.platformFeePercent) })}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {t("platform.members", { teachers: t("platform.teachers", { count: r._count.teachers }), students: t("platform.students", { count: r._count.students }) })}
                    </TableCell>
                    <TableCell className="hidden text-sm tabular-nums xl:table-cell" dir="ltr">
                      {formatBytes(r.storageBytes)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground tabular-nums xl:table-cell">{format.date(r.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "ACTIVE" ? "outline" : "destructive"}>{t(`platform.tenantStatus.${r.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <RowActions actions={actionsFor(r)} label={r.name} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <SubscriptionDialog tenant={managing} onClose={() => setManaging(null)} />
      <PlatformFeeDialog target={fee} onClose={() => setFee(null)} />
      <TenantSheet tenantId={viewing} onClose={() => setViewing(null)} />
      <CreateTenantDialog open={creating} onClose={() => setCreating(false)} onCreated={(tenant) => setViewing(tenant.id)} />
      <SupportDialog target={support} onClose={() => setSupport(null)} />
    </div>
  );
}
