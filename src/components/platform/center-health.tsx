"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangleIcon, EyeIcon, RocketIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import type { CenterHealth as Row, PlatformHealth } from "@/lib/types";

/** Super admin: centers to call, either before they leave or to offer a bigger package. */
export function CenterHealth({ onOpen }: { onOpen: (id: string) => void }) {
  const { t, format } = useI18n();
  const q = useQuery({
    queryKey: ["platform", "health"],
    queryFn: async () => (await api.get<PlatformHealth>("/platform/health")).data,
  });
  const data = q.data;
  const th = data?.thresholds;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("platform.health.title")}</CardTitle>
        <CardDescription>{t("platform.health.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {q.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(q.error, t("platform.health.loadFailed"))}</AlertDescription>
          </Alert>
        )}
        {!data ? (
          !q.isError && <Skeleton className="h-40" />
        ) : (
          <Tabs defaultValue="risk">
            <TabsList>
              <TabsTrigger value="risk" className="px-4">
                {t("platform.health.tabs.risk", { count: format.number(data.atRisk.length) })}
              </TabsTrigger>
              <TabsTrigger value="growth" className="px-4">
                {t("platform.health.tabs.growth", { count: format.number(data.growth.length) })}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="risk" className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                {th && t("platform.health.riskRule", { inactive: format.number(th.inactiveDays), stalled: format.number(th.trialStalledDays) })}
              </p>
              <HealthList rows={data.atRisk} kind="risk" empty={t("platform.health.emptyRisk")} onOpen={onOpen} />
            </TabsContent>
            <TabsContent value="growth" className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                {th &&
                  t("platform.health.growthRule", { percent: format.percent(th.limitRatio), sessions: format.number(th.engagedTrialSessions) })}
              </p>
              <HealthList rows={data.growth} kind="growth" empty={t("platform.health.emptyGrowth")} onOpen={onOpen} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function HealthList({ rows, kind, empty, onOpen }: { rows: Row[]; kind: "risk" | "growth"; empty: string; onOpen: (id: string) => void }) {
  const { t, format, locale } = useI18n();
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;

  const riskText = (s: Row["risk"][number]) => {
    const v = s.value ?? 0;
    if (s.code === "INACTIVE" || s.code === "ENDING_SOON") return t(`platform.health.risk.${s.code}`, { count: v });
    if (s.code === "SESSIONS_DROP") return t("platform.health.risk.SESSIONS_DROP", { percent: format.percent(v / 100) });
    return t(`platform.health.risk.${s.code}`);
  };
  const growthText = (s: Row["growth"][number]) => {
    const v = s.value ?? 0;
    if (s.code === "TRIAL_ENGAGED") return t("platform.health.growth.TRIAL_ENGAGED", { count: v });
    return t(`platform.health.growth.${s.code}`, { percent: format.percent(v / 100) });
  };

  return (
    <ul className="max-h-[28rem] divide-y overflow-y-auto">
      {rows.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => onOpen(r.id)} className="flex w-full flex-wrap items-start gap-x-3 gap-y-1.5 px-1 py-3 text-start hover:bg-muted/50">
            <span className="min-w-0 flex-1 basis-56">
              <span className="block truncate font-medium">
                <bdi>{r.name}</bdi>
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                <bdi>{locale === "ar" ? r.plan.nameAr : r.plan.nameEn}</bdi> ·{" "}
                {r.mrr ? (
                  <bdi>{t("platform.health.perMonth", { value: format.money(r.mrr.amount, r.mrr.currency) })}</bdi>
                ) : (
                  t(`platform.subscriptionStatus.${r.subscription.status}`)
                )}{" "}
                · {r.lastActiveAt ? t("platform.health.lastActive", { date: format.date(r.lastActiveAt) }) : t("platform.health.neverActive")}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              {kind === "risk" ? (
                <>
                  {r.severity === "high" ? (
                    <Badge variant="destructive">
                      <AlertTriangleIcon /> {t("platform.health.severity.high")}
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      <EyeIcon /> {t("platform.health.severity.medium")}
                    </Badge>
                  )}
                  {r.risk.map((s) => (
                    <Badge key={s.code} variant="outline">
                      {riskText(s)}
                    </Badge>
                  ))}
                </>
              ) : (
                r.growth.map((s) => (
                  <Badge key={s.code} variant="success">
                    <RocketIcon /> {growthText(s)}
                  </Badge>
                ))
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
