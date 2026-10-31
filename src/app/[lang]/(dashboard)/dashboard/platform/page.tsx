"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  Building2Icon,
  HardDriveIcon,
  HourglassIcon,
  SparklesIcon,
  UsersIcon,
  VideoIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { CenterHealth } from "@/components/platform/center-health";
import { PlatformEarnings } from "@/components/platform/platform-earnings";
import { SaasMetrics } from "@/components/platform/saas-metrics";
import TenantSheet from "@/components/platform/tenant-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/library";
import { cn } from "@/lib/utils";
import type { PlatformOverview } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The platform operator's home: health at a glance and what needs attention. */
export default function PlatformHomePage() {
  const { t } = useI18n();
  const overview = useQuery({
    queryKey: ["platform", "overview"],
    queryFn: async () => (await api.get<PlatformOverview>("/tenants/overview")).data,
  });
  const [viewing, setViewing] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t("platform.home.title")}</h1>
          <p className="text-muted-foreground">{t("platform.home.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/platform/centers">
              <Building2Icon /> {t("nav.platformAdmin")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/platform/plans">
              <WalletIcon /> {t("nav.platformPlans")}
            </Link>
          </Button>
        </div>
      </div>

      <Kpis data={overview.data} />

      <SaasMetrics />

      <CenterHealth onOpen={setViewing} />

      <PlatformEarnings onOpen={setViewing} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ExpiringSoon data={overview.data} onOpen={setViewing} />
        <Recent data={overview.data} onOpen={setViewing} />
      </div>

      <TenantSheet tenantId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function Kpis({ data }: { data?: PlatformOverview }) {
  const { t, format } = useI18n();
  const n = (v: number) => format.number(v);
  const tiles: { icon: LucideIcon; tone: string; label: string; value?: string; sub?: string; alert?: boolean; href?: string }[] = [
    { icon: Building2Icon, tone: "bg-secondary text-secondary-foreground", label: t("platform.kpi.centers"), value: data && n(data.tenants.total), sub: data && t("platform.kpi.centersSub", { active: n(data.tenants.active), suspended: n(data.tenants.suspended) }), href: "/dashboard/platform/centers" },
    { icon: SparklesIcon, tone: "bg-accent text-accent-foreground", label: t("platform.kpi.newThisMonth"), value: data && n(data.tenants.newThisMonth) },
    { icon: WalletIcon, tone: "bg-success/15 text-success", label: t("platform.kpi.activeSubs"), value: data && n(data.subscriptions.active), href: "/dashboard/platform/centers#active" },
    { icon: HourglassIcon, tone: "bg-info/15 text-info", label: t("platform.kpi.trialing"), value: data && n(data.subscriptions.trialing), href: "/dashboard/platform/centers#trialing" },
    {
      icon: AlertTriangleIcon,
      tone: "bg-destructive/10 text-destructive",
      label: t("platform.kpi.expired"),
      value: data && n(data.subscriptions.expired + data.subscriptions.pastDue),
      sub: data && t("platform.kpi.expiredSub", { expired: n(data.subscriptions.expired), pastDue: n(data.subscriptions.pastDue) }),
      alert: Boolean(data && data.subscriptions.expired + data.subscriptions.pastDue > 0),
      href: "/dashboard/platform/centers#expired",
    },
    { icon: UsersIcon, tone: "bg-secondary text-secondary-foreground", label: t("platform.kpi.users"), value: data && n(data.members.users), sub: data && t("platform.kpi.usersSub", { teachers: n(data.members.teachers), students: n(data.members.students) }) },
    { icon: VideoIcon, tone: "bg-warning/20 text-warning-foreground dark:text-warning", label: t("platform.kpi.sessions30"), value: data && n(data.sessions.last30Days), sub: data && t("platform.kpi.sessionsSub", { upcoming: n(data.sessions.upcoming) }) },
    { icon: HardDriveIcon, tone: "bg-muted text-muted-foreground", label: t("platform.kpi.storage"), value: data && formatBytes(data.storageBytes) },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => {
        const body = (
          <Card className={cn("h-full", tile.alert && "ring-destructive/40", tile.href && "transition-shadow hover:shadow-soft")}>
            <CardContent className="flex items-start gap-3 pt-2">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tile.tone)} aria-hidden="true">
                <tile.icon className="size-5" />
              </span>
              <div className="min-w-0">
                {tile.value === undefined ? <Skeleton className="mb-1 h-8 w-16" /> : <p className="text-2xl font-bold tabular-nums">{tile.value}</p>}
                <p className="text-sm text-muted-foreground">{tile.label}</p>
                {tile.sub && <p className="text-xs text-muted-foreground tabular-nums">{tile.sub}</p>}
              </div>
            </CardContent>
          </Card>
        );
        return tile.href ? (
          <Link key={tile.label} href={tile.href} className="block">
            {body}
          </Link>
        ) : (
          <div key={tile.label}>{body}</div>
        );
      })}
    </div>
  );
}

function ExpiringSoon({ data, onOpen }: { data?: PlatformOverview; onOpen: (id: string) => void }) {
  const { t, format, locale } = useI18n();
  // Read the clock once per mount: the list is a snapshot, not a ticking countdown.
  const [now] = useState(() => Date.now());
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("platform.expiringSoon.title")}</CardTitle>
        <CardDescription>{t("platform.expiringSoon.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Skeleton className="h-24" />
        ) : data.expiringSoon.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("platform.expiringSoon.empty")}</p>
        ) : (
          <ul className="divide-y">
            {data.expiringSoon.map((x) => {
              const days = Math.max(0, Math.ceil((new Date(x.currentPeriodEnd).getTime() - now) / DAY_MS));
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => onOpen(x.id)} className="flex w-full items-center gap-3 py-2.5 text-start hover:bg-muted/50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        <bdi>{x.name}</bdi>
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {locale === "ar" ? x.plan.nameAr : x.plan.nameEn} · {t(`platform.subscriptionStatus.${x.status}`)}
                      </span>
                    </span>
                    <Badge variant={days <= 3 ? "destructive" : "warning"}>{t("platform.expiringSoon.daysLeft", { count: days })}</Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">{format.date(x.currentPeriodEnd)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Recent({ data, onOpen }: { data?: PlatformOverview; onOpen: (id: string) => void }) {
  const { t, format } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("platform.recent.title")}</CardTitle>
        <CardDescription>{t("platform.recent.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Skeleton className="h-24" />
        ) : data.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("platform.recent.empty")}</p>
        ) : (
          <ul className="divide-y">
            {data.recent.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => onOpen(x.id)} className="flex w-full items-center gap-3 py-2.5 text-start hover:bg-muted/50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      <bdi>{x.name}</bdi>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {x.owner ? (
                        <>
                          <bdi>{x.owner.fullName}</bdi> · <span dir="ltr">{x.owner.email}</span>
                        </>
                      ) : (
                        t("platform.noOwner")
                      )}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{format.date(x.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {data && data.recent.length > 0 && (
          <Button asChild variant="link" size="sm" className="mt-2 px-0">
            <Link href="/dashboard/platform/centers">
              {t("platform.recent.all")} <ArrowLeftIcon className="rtl:rotate-0 ltr:rotate-180" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
