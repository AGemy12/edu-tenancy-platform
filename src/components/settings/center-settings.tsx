"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SaveFooter, SettingsSection } from "@/components/settings-section";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { authKeys } from "@/hooks/use-auth";
import { useTenantMe } from "@/hooks/use-resources";
import { useI18n, useT } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
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
