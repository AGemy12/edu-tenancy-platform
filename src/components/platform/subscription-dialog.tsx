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
import type { AdminPlan, PlatformTenant, SubscriptionStatus } from "@/lib/types";

const STATUSES: SubscriptionStatus[] = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"];
const EXTENSIONS = [1, 3, 12];

/** Super admin: change a center's package, status and end date by hand (renewals until payments exist). */
export default function SubscriptionDialog({ tenant, onClose }: { tenant: PlatformTenant | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={Boolean(tenant)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tenant && t("platform.dialog.title", { name: tenant.name })}</DialogTitle>
          <DialogDescription>{t("platform.dialog.description")}</DialogDescription>
        </DialogHeader>
        {tenant && <SubscriptionForm key={tenant.id} tenant={tenant} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionForm({ tenant, onDone }: { tenant: PlatformTenant; onDone: () => void }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const plans = useList<AdminPlan>("/plans/all");
  const sub = tenant.subscription;
  const [planId, setPlanId] = useState(sub?.plan.id ?? "");
  const [status, setStatus] = useState<SubscriptionStatus>(sub?.status ?? "ACTIVE");
  const [end, setEnd] = useState(toLocalDateInput(sub?.currentPeriodEnd ?? undefined));
  // A package granted for good: the period has no end.
  const [unlimited, setUnlimited] = useState(Boolean(sub && sub.currentPeriodEnd === null));

  /** Adds months to the end date, or to today if the period is already over. */
  function extend(months: number) {
    const today = new Date();
    setUnlimited(false);
    const from = end && new Date(`${end}T23:59`) > today ? new Date(`${end}T00:00`) : today;
    from.setMonth(from.getMonth() + months);
    setEnd(toLocalDateInput(from.toISOString()));
    if (status === "CANCELED" || status === "PAST_DUE") setStatus("ACTIVE");
  }

  const save = useMutation({
    mutationFn: async () =>
      api.patch(`/tenants/${tenant.id}/subscription`, {
        planId: planId || undefined,
        status,
        // The period runs to the end of the chosen day.
        currentPeriodEnd: unlimited ? null : end ? new Date(`${end}T23:59:59`).toISOString() : undefined,
      }),
    onSuccess: () => {
      toast.success(t("platform.dialog.saved"));
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["platform"] });
      onDone();
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Field>
        <FieldLabel htmlFor="sub-plan">{t("platform.dialog.plan")}</FieldLabel>
        <Select value={planId || undefined} onValueChange={setPlanId}>
          <SelectTrigger id="sub-plan" className="w-full">
            <SelectValue placeholder={plans.isPending ? t("common.labels.loading") : t("common.select.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {(plans.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {locale === "ar" ? p.nameAr : p.nameEn} <span className="text-muted-foreground" dir="ltr">({p.code})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="sub-status">{t("platform.dialog.status")}</FieldLabel>
        <Select value={status} onValueChange={(v) => setStatus(v as SubscriptionStatus)}>
          <SelectTrigger id="sub-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`platform.subscriptionStatus.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="sub-end">{t("platform.dialog.periodEnd")}</FieldLabel>
        <Input id="sub-end" type="date" dir="ltr" value={end} disabled={unlimited} onChange={(e) => setEnd(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-sm text-muted-foreground">{t("platform.dialog.extend")}</span>
          {EXTENSIONS.map((m) => (
            <Button key={m} type="button" variant="outline" size="xs" onClick={() => extend(m)}>
              <CalendarPlusIcon data-icon="inline-start" /> {t("platform.dialog.extendMonths", { count: m })}
            </Button>
          ))}
        </div>
      </Field>
      <Field orientation="horizontal" className="items-start rounded-xl border p-3">
        <Switch id="sub-unlimited" checked={unlimited} onCheckedChange={setUnlimited} />
        <div className="space-y-0.5">
          <FieldLabel htmlFor="sub-unlimited">{t("platform.dialog.unlimited")}</FieldLabel>
          <FieldDescription>{t("platform.dialog.unlimitedHint")}</FieldDescription>
        </div>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending || (!sub && (!planId || (!end && !unlimited)))}>
          {save.isPending && <Loader2Icon className="animate-spin" />}
          {t("common.actions.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
