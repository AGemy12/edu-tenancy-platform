"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlusIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useList } from "@/hooks/use-resources";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { toLocalDateInput } from "@/lib/schemas";
import type { AdminPlan, CreateTenantInput, PlatformTenant } from "@/lib/types";

const TRIAL_DAYS = 14;
const EXTENSIONS = [1, 3, 12];
const SLUG = "^[a-z0-9-]{3,40}$";

const inDays = (days: number) => toLocalDateInput(new Date(Date.now() + days * 86_400_000).toISOString());

/** Super admin: set up a center for a customer, with its owner and package. */
export default function CreateTenantDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (t: PlatformTenant) => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("platform.create.title")}</DialogTitle>
          <DialogDescription>{t("platform.create.description")}</DialogDescription>
        </DialogHeader>
        {open && <CreateForm onDone={onClose} onCreated={onCreated} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({ onDone, onCreated }: { onDone: () => void; onCreated?: (t: PlatformTenant) => void }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const plans = useList<AdminPlan>("/plans/all");
  const [form, setForm] = useState({ name: "", slug: "", ownerName: "", ownerEmail: "", ownerPhone: "" });
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState<CreateTenantInput["status"]>("TRIALING");
  const [end, setEnd] = useState(inDays(TRIAL_DAYS));
  const [unlimited, setUnlimited] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function extend(months: number) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setUnlimited(false);
    setEnd(toLocalDateInput(d.toISOString()));
  }

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post<PlatformTenant>("/tenants", {
          ...form,
          ownerPhone: form.ownerPhone.trim() || undefined,
          planId,
          status,
          // The period runs to the end of the chosen day.
          currentPeriodEnd: unlimited ? null : new Date(`${end}T23:59:59`).toISOString(),
        } satisfies CreateTenantInput)
      ).data,
    onSuccess: (tenant) => {
      toast.success(t("platform.create.created", { name: tenant.name }), { description: t("platform.create.createdHint") });
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["platform"] });
      onCreated?.(tenant);
      onDone();
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))),
  });

  const activePlans = (plans.data ?? []).filter((p) => p.isActive);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="ct-name">{t("platform.create.name")}</FieldLabel>
          <Input id="ct-name" value={form.name} onChange={set("name")} maxLength={80} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="ct-slug">{t("platform.create.slug")}</FieldLabel>
          <Input
            id="ct-slug"
            dir="ltr"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
            pattern={SLUG}
            title={t("platform.create.slugHint")}
            required
          />
          <FieldDescription>{t("platform.create.slugHint")}</FieldDescription>
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-xl border p-3">
        <legend className="px-1 text-sm font-semibold">{t("platform.create.owner")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ct-owner">{t("platform.create.ownerName")}</FieldLabel>
            <Input id="ct-owner" value={form.ownerName} onChange={set("ownerName")} maxLength={120} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="ct-phone">{t("platform.create.ownerPhone")}</FieldLabel>
            <Input id="ct-phone" dir="ltr" type="tel" value={form.ownerPhone} onChange={set("ownerPhone")} maxLength={30} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="ct-email">{t("platform.create.ownerEmail")}</FieldLabel>
          <Input id="ct-email" dir="ltr" type="email" value={form.ownerEmail} onChange={set("ownerEmail")} required />
          <FieldDescription>{t("platform.create.ownerHint")}</FieldDescription>
        </Field>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="ct-plan">{t("platform.dialog.plan")}</FieldLabel>
          <Select value={planId || undefined} onValueChange={setPlanId}>
            <SelectTrigger id="ct-plan" className="w-full">
              <SelectValue placeholder={plans.isPending ? t("common.labels.loading") : t("common.select.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {activePlans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {locale === "ar" ? p.nameAr : p.nameEn} <span className="text-muted-foreground" dir="ltr">({p.code})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="ct-status">{t("platform.dialog.status")}</FieldLabel>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as CreateTenantInput["status"]);
              if (v === "TRIALING") {
                setUnlimited(false);
                setEnd(inDays(TRIAL_DAYS));
              }
            }}
          >
            <SelectTrigger id="ct-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRIALING">{t("platform.subscriptionStatus.TRIALING")}</SelectItem>
              <SelectItem value="ACTIVE">{t("platform.subscriptionStatus.ACTIVE")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="ct-end">{t("platform.dialog.periodEnd")}</FieldLabel>
        <Input id="ct-end" type="date" dir="ltr" value={end} disabled={unlimited} onChange={(e) => setEnd(e.target.value)} required={!unlimited} />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" variant="outline" size="xs" onClick={() => setEnd(inDays(TRIAL_DAYS))}>
            <CalendarPlusIcon data-icon="inline-start" /> {t("platform.create.trialDays", { count: TRIAL_DAYS })}
          </Button>
          {EXTENSIONS.map((m) => (
            <Button key={m} type="button" variant="outline" size="xs" onClick={() => extend(m)}>
              <CalendarPlusIcon data-icon="inline-start" /> {t("platform.dialog.extendMonths", { count: m })}
            </Button>
          ))}
        </div>
      </Field>
      <Field orientation="horizontal" className="items-start rounded-xl border p-3">
        <Switch id="ct-unlimited" checked={unlimited} onCheckedChange={setUnlimited} />
        <div className="space-y-0.5">
          <FieldLabel htmlFor="ct-unlimited">{t("platform.dialog.unlimited")}</FieldLabel>
          <FieldDescription>{t("platform.dialog.unlimitedHint")}</FieldDescription>
        </div>
      </Field>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="submit" disabled={create.isPending || !planId || (!end && !unlimited)}>
          {create.isPending && <Loader2Icon className="animate-spin" />}
          {t("platform.create.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
