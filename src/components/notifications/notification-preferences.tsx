"use client";

import { useState } from "react";
import { BellRingIcon, LockIcon, Volume2Icon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { SettingsSection } from "@/components/settings-section";
import { useNotificationPreferences, useSaveNotificationPreferences } from "@/hooks/use-notifications";
import { type DesktopState, chime, desktopState, setDesktopAlerts, setSound, soundOn } from "@/lib/alerts";
import type { NotificationPreference } from "@/lib/types";
import { categoryIcon } from "./notification-text";

/** Per category: in-app and email; then this device's desktop alerts and sound. */
export function NotificationPreferences() {
  const { t } = useI18n();
  const prefs = useNotificationPreferences();
  const save = useSaveNotificationPreferences();

  const toggle = (p: NotificationPreference, change: Partial<Pick<NotificationPreference, "inApp" | "email">>) =>
    save.mutate([{ category: p.category, inApp: change.inApp ?? p.inApp, email: change.email ?? p.email }]);

  return (
    <div className="space-y-8">
      <SettingsSection title={t("notifications.prefs.title")} description={t("notifications.prefs.description")}>
        <Card>
          <CardContent className="p-0">
            <div className="hidden grid-cols-[1fr_6rem_6rem] gap-2 border-b px-5 py-2.5 text-xs font-semibold text-muted-foreground sm:grid">
              <span />
              <span className="text-center">{t("notifications.prefs.inApp")}</span>
              <span className="text-center">{t("notifications.prefs.email")}</span>
            </div>
            {prefs.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="m-4 h-12" />)
              : prefs.data?.map((p) => {
                  const Icon = categoryIcon(p.category);
                  const label = t(`notifications.categories.${p.category}`);
                  return (
                    <div key={p.category} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 border-b px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_6rem_6rem] sm:gap-2">
                      <div className="flex min-w-0 gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">{t(`notifications.categoryHints.${p.category}`)}</p>
                          {p.locked && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <LockIcon className="size-3" aria-hidden="true" /> {t("notifications.prefs.locked")}
                            </p>
                          )}
                        </div>
                      </div>
                      <label className="flex flex-col items-center gap-1 sm:justify-self-center">
                        <span className="text-[0.65rem] text-muted-foreground sm:hidden">{t("notifications.prefs.inApp")}</span>
                        <Switch
                          checked={p.inApp}
                          disabled={p.locked || save.isPending}
                          onCheckedChange={(v) => toggle(p, { inApp: v })}
                          aria-label={`${label} — ${t("notifications.prefs.inApp")}`}
                        />
                      </label>
                      <label className="flex flex-col items-center gap-1 sm:justify-self-center" title={p.emailAvailable ? undefined : t("notifications.prefs.noEmail")}>
                        <span className="text-[0.65rem] text-muted-foreground sm:hidden">{t("notifications.prefs.email")}</span>
                        <Switch
                          checked={p.emailAvailable && p.email}
                          disabled={!p.emailAvailable || save.isPending}
                          onCheckedChange={(v) => toggle(p, { email: v })}
                          aria-label={`${label} — ${t("notifications.prefs.email")}`}
                        />
                      </label>
                    </div>
                  );
                })}
          </CardContent>
        </Card>
      </SettingsSection>

      <DeviceAlerts />
    </div>
  );
}

function DeviceAlerts() {
  const { t } = useI18n();
  // Browser-only state; this view renders on the client (it reads the URL under Suspense).
  const [desktop, setDesktop] = useState<DesktopState>(desktopState);
  const [sound, setSoundState] = useState(soundOn);

  return (
    <SettingsSection title={t("notifications.prefs.desktop.title")} description={t("notifications.prefs.desktop.description")}>
      <Card>
        <CardContent className="divide-y p-0">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <BellRingIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm">
                {desktop === "on"
                  ? t("notifications.prefs.desktop.enabled")
                  : desktop === "denied"
                    ? t("notifications.prefs.desktop.denied")
                    : desktop === "unsupported"
                      ? t("notifications.prefs.desktop.unsupported")
                      : t("notifications.prefs.desktop.title")}
              </p>
            </div>
            {(desktop === "on" || desktop === "off") && (
              <Button variant={desktop === "on" ? "outline" : "default"} size="sm" onClick={async () => setDesktop(await setDesktopAlerts(desktop !== "on"))}>
                {desktop === "on" ? t("notifications.prefs.desktop.off") : t("notifications.prefs.desktop.enable")}
              </Button>
            )}
          </div>
          <label className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="flex min-w-0 items-center gap-3">
              <Volume2Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-sm font-medium">{t("notifications.prefs.sound.title")}</span>
                <span className="block text-xs text-muted-foreground">{t("notifications.prefs.sound.description")}</span>
              </span>
            </span>
            <Switch
              checked={sound}
              onCheckedChange={(v) => {
                setSound(v);
                setSoundState(v);
                if (v) chime();
              }}
              aria-label={t("notifications.prefs.sound.title")}
            />
          </label>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
