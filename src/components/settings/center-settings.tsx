"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SaveFooter, SettingsSection } from "@/components/settings-section";
import { ImageIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { authKeys } from "@/hooks/use-auth";
import { useTenantMe } from "@/hooks/use-resources";
import { useI18n, useT } from "@/i18n/provider";
import { API_URL, api, getErrorMessage } from "@/lib/api";
import type { TenantMe } from "@/lib/types";

/** Zones and currencies of the region first; the center's current value is always offered too. */
const TIMEZONES = [
  "Africa/Cairo",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Kuwait",
  "Asia/Qatar",
  "Asia/Bahrain",
  "Asia/Muscat",
  "Asia/Amman",
  "Asia/Baghdad",
  "Asia/Beirut",
  "Asia/Damascus",
  "Asia/Gaza",
  "Asia/Aden",
  "Africa/Khartoum",
  "Africa/Tripoli",
  "Africa/Tunis",
  "Africa/Algiers",
  "Africa/Casablanca",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "UTC",
];
const CURRENCIES = ["EGP", "SAR", "AED", "KWD", "QAR", "BHD", "OMR", "JOD", "IQD", "LBP", "SYP", "YER", "SDG", "LYD", "TND", "DZD", "MAD", "TRY", "USD", "EUR", "GBP"];

/** "GMT+3" for a zone, right now. */
function offsetOf(zone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
  } catch {
    return undefined;
  }
}

export default function CenterSettings() {
  const t = useT();
  const tenant = useTenantMe();
  if (!tenant.isPending && !tenant.data) return null;
  return (
    <SettingsSection title={t("settings.center.title")} description={t("settings.center.description")}>
      {tenant.data ? (
        // Keyed so the form restarts from the saved values after a save.
        <CenterForm key={`${tenant.data.name}|${tenant.data.timezone}|${tenant.data.currency}`} tenant={tenant.data} />
      ) : (
        <Skeleton className="h-64 rounded-2xl" />
      )}
    </SettingsSection>
  );
}

function CenterForm({ tenant }: { tenant: TenantMe }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState(tenant.name);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [currency, setCurrency] = useState(tenant.currency);

  const zones = TIMEZONES.includes(tenant.timezone) ? TIMEZONES : [tenant.timezone, ...TIMEZONES];
  const currencies = CURRENCIES.includes(tenant.currency) ? CURRENCIES : [tenant.currency, ...CURRENCIES];
  const currencyNames = new Intl.DisplayNames([locale], { type: "currency" });
  const changed = name.trim() !== tenant.name || timezone !== tenant.timezone || currency !== tenant.currency;

  const save = useMutation({
    mutationFn: async () => (await api.patch<TenantMe>("/tenants/me", { name: name.trim(), timezone, currency })).data,
    onSuccess: (data) => {
      toast.success(t("settings.center.saved"));
      qc.setQueryData(["tenant", "me"], data);
      // The center's name shows in the sidebar (from /auth/me) and amounts follow the currency.
      qc.invalidateQueries({ queryKey: authKeys.me });
      qc.invalidateQueries({ queryKey: ["list"] });
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))),
  });

  return (
    <Card>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2) save.mutate();
        }}
      >
        <CardContent className="grid gap-5 pt-2 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="center-name">{t("settings.center.name")}</FieldLabel>
            <Input id="center-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="center-timezone">{t("settings.center.timezone")}</FieldLabel>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="center-timezone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z} value={z}>
                    <span dir="ltr">
                      {z} <span className="text-muted-foreground">({offsetOf(z)})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{t("settings.center.timezoneHint")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="center-currency">{t("settings.center.currency")}</FieldLabel>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="center-currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {currencyNames.of(c)} <span className="text-muted-foreground" dir="ltr">({c})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{t("settings.center.currencyHint")}</FieldDescription>
          </Field>
        </CardContent>
        <SaveFooter dirty={changed} disabled={!changed || name.trim().length < 2} pending={save.isPending} />
      </form>
    </Card>
  );
}

const LOGO_TYPES = "image/png,image/jpeg,image/webp";
const LOGO_MAX_MB = 2;

/** The center's logo, printed beside the platform's brand on every PDF report. */
export function CenterLogo() {
  const { t, format } = useI18n();
  const qc = useQueryClient();
  const tenant = useTenantMe();
  const input = useRef<HTMLInputElement>(null);

  const onSaved = (data: TenantMe) => qc.setQueryData(["tenant", "me"], data);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return (await api.post<TenantMe>("/tenants/me/logo", form, { headers: { "Content-Type": "multipart/form-data" } })).data;
    },
    onSuccess: (data) => {
      onSaved(data);
      toast.success(t("settings.logo.saved"));
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))),
  });
  const remove = useMutation({
    mutationFn: async () => (await api.delete<TenantMe>("/tenants/me/logo")).data,
    onSuccess: (data) => {
      onSaved(data);
      toast.success(t("settings.logo.removed"));
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.deleteFailed"))),
  });

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (file.size > LOGO_MAX_MB * 1024 * 1024) {
      toast.error(t("settings.logo.tooLarge", { mb: format.number(LOGO_MAX_MB) }));
      return;
    }
    upload.mutate(file);
  };

  if (!tenant.isPending && !tenant.data) return null;
  const url = tenant.data?.logoUrl;
  const busy = upload.isPending || remove.isPending;
  return (
    <SettingsSection title={t("settings.logo.title")} description={t("settings.logo.description")}>
      <Card>
        <CardContent className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-center">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted/40">
            {tenant.isPending ? (
              <Skeleton className="size-full" />
            ) : url ? (
              // eslint-disable-next-line @next/next/no-img-element -- a signed API link, not a static asset
              <img src={`${API_URL}${url}`} alt={t("settings.logo.alt")} className="max-h-20 max-w-20 object-contain" />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("settings.logo.hint", { mb: format.number(LOGO_MAX_MB) })}</p>
            <div className="flex flex-wrap gap-2">
              <input ref={input} type="file" accept={LOGO_TYPES} className="sr-only" tabIndex={-1} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              <Button type="button" variant="outline" disabled={busy || tenant.isPending} onClick={() => input.current?.click()}>
                {upload.isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
                {t(url ? "settings.logo.replace" : "settings.logo.upload")}
              </Button>
              {url && (
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => remove.mutate()}>
                  <Trash2Icon data-icon="inline-start" />
                  {t("settings.logo.remove")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
