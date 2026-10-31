"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2Icon, CalendarDaysIcon, ClipboardCheckIcon, LifeBuoyIcon, LinkIcon, LogInIcon, VideoIcon } from "lucide-react";
import { AccountStatusBadge } from "@/components/account-status";
import SupportDialog, { type SupportTarget } from "@/components/platform/support-dialog";
import { SupportLog, SupportRequests } from "@/components/platform/support-log";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/library";
import type { PlatformTenantDetail, SessionStatus, SubscriptionStatus } from "@/lib/types";

const SUB_TONE: Record<SubscriptionStatus, "success" | "info" | "warning" | "destructive"> = {
  ACTIVE: "success",
  TRIALING: "info",
  PAST_DUE: "warning",
  CANCELED: "destructive",
};
const SESSION_ORDER: SessionStatus[] = ["COMPLETED", "SCHEDULED", "LIVE", "MISSED", "CANCELED"];
const MB = 1024 * 1024;

/** Super admin: one center in depth, read-only. Actions stay in the row menu. */
export default function TenantSheet({ tenantId, onClose }: { tenantId: string | null; onClose: () => void }) {
  const { dir } = useI18n();
  return (
    <Sheet open={Boolean(tenantId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={dir === "rtl" ? "left" : "right"} className="w-full overflow-y-auto sm:max-w-xl">
        {tenantId && <TenantDetail id={tenantId} />}
      </SheetContent>
    </Sheet>
  );
}

function TenantDetail({ id }: { id: string }) {
  const { t, format, locale } = useI18n();
  const q = useQuery({
    queryKey: ["platform", "tenant", id],
    queryFn: async () => (await api.get<PlatformTenantDetail>(`/tenants/${id}`)).data,
  });
  const d = q.data;
  const [support, setSupport] = useState<SupportTarget | null>(null);

  if (!d) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  const plan = d.subscription?.plan;
  const name = (p: { nameAr: string; nameEn: string }) => (locale === "ar" ? p.nameAr : p.nameEn);
  // The center's whole allowance: each teacher's (and the admin's) personal quota plus the shared library.
  const storageMax = plan ? (plan.storagePerTeacherMb * (d.counts.teachers + 1) + plan.sharedStorageMb) * MB : 0;

  return (
    <div className="space-y-6 pb-8">
      <SheetHeader>
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle className="text-xl">
            <bdi>{d.name}</bdi>
          </SheetTitle>
          <Badge variant={d.status === "ACTIVE" ? "outline" : "destructive"}>{t(`platform.tenantStatus.${d.status}`)}</Badge>
        </div>
        <SheetDescription className="space-y-0.5">
          <span className="block" dir="ltr">
            {d.slug}
          </span>
          <span className="block">
            {t("platform.detail.createdAt", { date: format.date(d.createdAt) })} ·{" "}
            {d.lastLoginAt ? t("platform.detail.lastLogin", { date: format.dateTime(d.lastLoginAt) }) : t("platform.detail.noLogin")}
          </span>
        </SheetDescription>
        <div className="pt-2">
          <Button variant="highlight" size="sm" disabled={d.status !== "ACTIVE"} onClick={() => setSupport({ tenantId: d.id, tenantName: d.name })}>
            <LifeBuoyIcon data-icon="inline-start" /> {t("support.requestAsOwner")}
          </Button>
          {d.status !== "ACTIVE" && <p className="mt-1 text-xs text-muted-foreground">{t("support.suspendedHint")}</p>}
        </div>
      </SheetHeader>

      <div className="space-y-6 px-4 sm:px-6">
        {/* Subscription and limits */}
        <Section icon={CalendarDaysIcon} title={t("platform.detail.subscription")}>
          {d.subscription && plan ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  <bdi>{name(plan)}</bdi>
                </span>
                <Badge variant={SUB_TONE[d.subscription.status]}>{t(`platform.subscriptionStatus.${d.subscription.status}`)}</Badge>
                {d.subscriptionExpired && <Badge variant="destructive">{t("platform.expired")}</Badge>}
                <span className="text-sm text-muted-foreground">
                  {plan.priceMonthly ? t("platform.detail.price", { price: format.number(Number(plan.priceMonthly)), currency: plan.currency }) : t("platform.detail.free")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground tabular-nums">
                {t("platform.detail.period")}: {format.date(d.subscription.currentPeriodStart)} ← {d.subscription.currentPeriodEnd ? format.date(d.subscription.currentPeriodEnd) : t("platform.unlimited")}
              </p>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase">{t("platform.detail.usage")}</p>
                <Usage label={t("platform.detail.teachersOf", { used: format.number(d.counts.teachers), max: format.number(plan.maxTeachers) })} value={d.counts.teachers} max={plan.maxTeachers} />
                <Usage label={t("platform.detail.studentsOf", { used: format.number(d.counts.students), max: format.number(plan.maxStudents) })} value={d.counts.students} max={plan.maxStudents} />
                <Usage label={t("platform.detail.storageOf", { used: formatBytes(d.storageBytes), max: formatBytes(storageMax) })} value={d.storageBytes} max={storageMax} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("platform.noPlan")}</p>
          )}
        </Section>

        {/* Activity */}
        <Section icon={VideoIcon} title={t("platform.detail.activity")}>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t("platform.detail.sessions30")} value={d.sessions.last30Days} />
            <Stat label={t("platform.detail.courses")} value={d.counts.courses} />
            <Stat label={t("platform.detail.exams")} value={d.counts.exams} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="me-1 text-xs text-muted-foreground">{t("platform.detail.sessionsByStatus")}:</span>
            {SESSION_ORDER.filter((s) => d.sessions.byStatus[s]).map((s) => (
              <Badge key={s} variant="secondary">
                {t(`platform.detail.sessionStatus.${s}`)} {format.number(d.sessions.byStatus[s] ?? 0)}
              </Badge>
            ))}
            {d.counts.sessions === 0 && <span className="text-xs text-muted-foreground">0</span>}
          </div>
        </Section>

        {/* Members */}
        <Section icon={Building2Icon} title={`${t("platform.detail.members")} (${format.number(d.members.length)})`}>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("platform.detail.memberColumns.name")}</TableHead>
                  <TableHead>{t("platform.detail.memberColumns.role")}</TableHead>
                  <TableHead>{t("platform.detail.memberColumns.status")}</TableHead>
                  <TableHead>{t("platform.detail.memberColumns.lastLogin")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          disabled={d.status !== "ACTIVE" || m.status === "BLOCKED"}
                          aria-label={t("support.requestAs", { name: m.user.fullName })}
                          title={t("support.requestAs", { name: m.user.fullName })}
                          onClick={() => setSupport({ tenantId: d.id, tenantName: d.name, membership: { id: m.id, name: m.user.fullName, role: m.role } })}
                        >
                          <LogInIcon className="rtl:rotate-180" />
                        </Button>
                        <div className="min-w-0">
                          <p className="font-medium">
                            <bdi>{m.user.fullName}</bdi>
                          </p>
                          <p className="truncate text-xs text-muted-foreground" dir="ltr">
                            {m.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t(`common.roles.${m.role}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <AccountStatusBadge status={m.status} reason={m.statusReason} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {m.user.lastLoginAt ? format.dateTime(m.user.lastLoginAt) : t("platform.detail.never")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        {/* Integrations and settings */}
        <Section icon={LinkIcon} title={t("platform.detail.integrations")}>
          {d.integrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("platform.detail.noIntegrations")}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {d.integrations.map((i, n) => (
                <li key={n}>
                  <Badge variant="outline">
                    <span dir="ltr">{t(`platform.detail.provider.${i.provider}`)}</span> · <bdi>{i.user}</bdi>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section icon={ClipboardCheckIcon} title={t("platform.detail.settings")}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("platform.detail.timezone")}</dt>
              <dd dir="ltr" className="text-start">
                {d.timezone}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("platform.detail.currency")}</dt>
              <dd dir="ltr" className="text-start">
                {d.currency}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("platform.detail.platformFee")}</dt>
              <dd className="tabular-nums">
                {d.platformFeePercent === null ? t("platform.noFee") : <span dir="ltr">{t("platform.feePercent", { percent: format.number(d.platformFeePercent) })}</span>}
              </dd>
            </div>
          </dl>
        </Section>
        <Section icon={LifeBuoyIcon} title={t("support.requests.title")}>
          <SupportRequests tenantId={d.id} />
        </Section>
        <Section icon={LifeBuoyIcon} title={t("support.log.title")}>
          <SupportLog tenantId={d.id} />
        </Section>
      </div>
      <SupportDialog target={support} onClose={() => setSupport(null)} />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof VideoIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function Usage({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={pct >= 90 ? "font-semibold text-destructive" : "text-muted-foreground"}>{pct}%</span>
      </div>
      <Progress value={pct} className={pct >= 90 ? "[&>[data-slot=progress-indicator]]:bg-destructive" : undefined} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const { format } = useI18n();
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <p className="text-2xl font-bold tabular-nums">{format.number(value)}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
