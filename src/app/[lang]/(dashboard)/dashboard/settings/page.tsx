"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDaysIcon, CheckCircle2Icon, InfoIcon, Loader2Icon, UsersIcon, VideoIcon, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import CenterSettings, { CenterLogo } from "@/components/settings/center-settings";
import { SupportAccess } from "@/components/settings/support-access";
import { SettingsHeader, SettingsSection } from "@/components/settings-section";
import { useCurrentUser } from "@/hooks/use-auth";
import { useIntegrations } from "@/hooks/use-resources";
import { Link } from "@/i18n/navigation";
import { useT } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";

type Provider = "zoom" | "google";

const PROVIDERS: { provider: Provider; name: string; icon: LucideIcon; tint: string }[] = [
  { provider: "zoom", name: "Zoom", icon: VideoIcon, tint: "bg-info/15 text-info" },
  { provider: "google", name: "Google Meet", icon: CalendarDaysIcon, tint: "bg-success/15 text-success" },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40 max-w-5xl rounded-2xl" />}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const t = useT();
  const { user } = useCurrentUser();
  const params = useSearchParams();

  return (
    <div className="max-w-5xl space-y-8">
      <SettingsHeader title={t("settings.title")} description={user?.tenant && <bdi>{user.tenant.name}</bdi>} />

      {/* The OAuth callbacks come back with ?zoom=connected / ?google=error */}
      {PROVIDERS.map(({ provider: key }) => {
        const flash = params.get(key);
        if (flash === "connected") {
          return (
            <Alert key={key}>
              <CheckCircle2Icon />
              <AlertDescription>{t(`settings.${key}.connectSuccess`)}</AlertDescription>
            </Alert>
          );
        }
        if (flash === "error") {
          return (
            <Alert key={key} variant="destructive">
              <AlertDescription>{t(`settings.${key}.connectError`)}</AlertDescription>
            </Alert>
          );
        }
        return null;
      })}

      {user?.role === "TENANT_ADMIN" && (
        <>
          <CenterSettings />
          <Separator />
          <CenterLogo />
          <Separator />
          {/* Support decides nothing about its own access. */}
          {!user.support && (
            <>
              <SupportAccess />
              <Separator />
            </>
          )}
        </>
      )}

      {(user?.role === "TENANT_ADMIN" || user?.role === "TEACHER") && <MeetingAccounts />}
    </div>
  );
}

/**
 * Sessions are created on their teacher's own account, so the teacher links it. An admin who
 * doesn't teach has nothing to link: they're pointed to the teachers page, and can only
 * disconnect an account linked before.
 */
function MeetingAccounts() {
  const t = useT();
  const status = useIntegrations();
  const canLink = status.data?.canLink ?? true;
  const rows = canLink ? PROVIDERS : PROVIDERS.filter((p) => status.data?.[p.provider].account);

  return (
    <SettingsSection title={t("settings.integrations")} description={t(canLink ? "settings.integrationsDescription" : "settings.adminDescription")}>
      {!canLink && (
        <Alert>
          <InfoIcon />
          <AlertDescription className="space-y-3">
            <p>{t("settings.adminNote")}</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/teachers">
                <UsersIcon data-icon="inline-start" /> {t("settings.adminTeachers")}
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {rows.length > 0 && (
        <Card className="gap-0 py-0">
          <ul className="divide-y">
            {rows.map((p) => (
              <IntegrationRow key={p.provider} {...p} canLink={canLink} />
            ))}
          </ul>
        </Card>
      )}
    </SettingsSection>
  );
}

function IntegrationRow({ provider, name, icon: Icon, tint, canLink }: (typeof PROVIDERS)[number] & { canLink: boolean }) {
  const t = useT();
  const qc = useQueryClient();
  const status = useIntegrations();
  const [busy, setBusy] = useState(false);
  const info = status.data?.[provider];
  const unavailable = info !== undefined && !info.configured && !info.account;

  async function connect() {
    setBusy(true);
    try {
      const { data } = await api.get<{ url: string }>(`/integrations/${provider}/connect`);
      window.location.assign(data.url);
    } catch (e) {
      toast.error(getErrorMessage(e, t("settings.connectFailed")));
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await api.delete(`/integrations/${provider}`);
      toast.success(t(`settings.${provider}.disconnected`));
      qc.invalidateQueries({ queryKey: ["integrations"] });
    } catch (e) {
      toast.error(getErrorMessage(e, t("settings.disconnectFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 gap-3.5">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tint)} aria-hidden="true">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold" dir="ltr">
              {name}
            </span>
            {info?.account && <Badge variant="success">{t("settings.connected")}</Badge>}
            {unavailable && <Badge variant="outline">{t("settings.unavailable")}</Badge>}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{t(`settings.${provider}.description`)}</p>
          {info?.account?.email && (
            <p className="truncate text-sm font-medium">
              <bdi dir="ltr">{info.account.email}</bdi>
            </p>
          )}
          {unavailable && <p className="text-xs text-muted-foreground">{t("settings.notConfigured")}</p>}
          {!canLink && info?.account && <p className="text-xs text-muted-foreground">{t("settings.unusedAccount")}</p>}
        </div>
      </div>
      <div className="shrink-0 ps-14.5 sm:ps-0">
        {status.isPending ? (
          <Skeleton className="h-10 w-36 rounded-full" />
        ) : info?.account ? (
          <Button variant="destructive-soft" onClick={disconnect} disabled={busy}>
            {busy && <Loader2Icon className="animate-spin" />}
            {t("settings.disconnect")}
          </Button>
        ) : unavailable || !canLink ? null : (
          <Button onClick={connect} disabled={busy}>
            {busy && <Loader2Icon className="animate-spin" />}
            {t(`settings.${provider}.connect`)}
          </Button>
        )}
      </div>
    </li>
  );
}
