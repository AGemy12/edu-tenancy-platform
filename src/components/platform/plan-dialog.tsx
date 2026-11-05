"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { TextField, TextareaField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { planSchema, type PlanInput, type PlanOutput } from "@/lib/schemas";
import type { AdminPlan } from "@/lib/types";

/** Super admin: a package's names, price, limits and visibility. `plan` null = a new one. */
export default function PlanDialog({ open, plan, onClose }: { open: boolean; plan: AdminPlan | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan ? t("platform.plans.dialog.editTitle", { name: plan.nameAr }) : t("platform.plans.dialog.createTitle")}</DialogTitle>
          <DialogDescription>{t("platform.plans.dialog.description")}</DialogDescription>
        </DialogHeader>
        {open && <PlanForm key={plan?.id ?? "new"} plan={plan} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function toForm(p: AdminPlan | null): PlanInput {
  return {
    code: p?.code ?? "",
    nameAr: p?.nameAr ?? "",
    nameEn: p?.nameEn ?? "",
    descriptionAr: p?.descriptionAr ?? "",
    descriptionEn: p?.descriptionEn ?? "",
    priceMonthly: p?.priceMonthly ?? "",
    platformFeePercent: p?.platformFeePercent == null ? "" : String(p.platformFeePercent),
    currency: p?.currency ?? "EGP",
    maxTeachers: String(p?.maxTeachers ?? 5),
    maxStudents: String(p?.maxStudents ?? 100),
    storagePerTeacherMb: String(p?.storagePerTeacherMb ?? 1024),
    sharedStorageMb: String(p?.sharedStorageMb ?? 2048),
    maxFileMb: String(p?.maxFileMb ?? 50),
    sortOrder: String(p?.sortOrder ?? 0),
    isPublic: p?.isPublic ?? true,
    isActive: p?.isActive ?? true,
  };
}

function PlanForm({ plan, onDone }: { plan: AdminPlan | null; onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const form = useForm<PlanInput, unknown, PlanOutput>({ resolver: zodResolver(planSchema), defaultValues: toForm(plan) });

  const save = useMutation({
    mutationFn: async ({ code, ...rest }: PlanOutput) =>
      // The code is the package's identity: set once, never edited.
      plan ? (await api.patch(`/plans/${plan.id}`, rest)).data : (await api.post("/plans", { code, ...rest })).data,
    onSuccess: () => {
      toast.success(t("platform.plans.toast.saved"));
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["platform"] });
      onDone();
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))),
  });

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField control={form.control} name="code" label={t("fields.planCode")} dir="ltr" placeholder="TEAM" disabled={Boolean(plan)} hint={plan ? undefined : t("platform.plans.dialog.codeHint")} />
        <TextField control={form.control} name="sortOrder" label={t("fields.sortOrder")} type="number" dir="ltr" hint={t("platform.plans.dialog.sortHint")} />
        <TextField control={form.control} name="nameAr" label={t("fields.planNameAr")} />
        <TextField control={form.control} name="nameEn" label={t("fields.planNameEn")} dir="ltr" />
        <TextareaField control={form.control} name="descriptionAr" label={t("fields.descriptionAr")} rows={2} />
        <TextareaField control={form.control} name="descriptionEn" label={t("fields.descriptionEn")} rows={2} dir="ltr" />
        <TextField control={form.control} name="priceMonthly" label={t("fields.priceMonthly")} type="number" dir="ltr" hint={t("platform.plans.dialog.priceHint")} />
        <TextField control={form.control} name="currency" label={t("fields.currency")} dir="ltr" placeholder="EGP" maxLength={3} />
        <TextField control={form.control} name="platformFeePercent" label={t("fields.platformFeePercent")} type="number" dir="ltr" hint={t("platform.plans.dialog.feeHint")} />
      </div>

      <fieldset className="space-y-3 rounded-xl border p-4">
        <legend className="px-1 text-sm font-semibold">{t("platform.plans.dialog.limits")}</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField control={form.control} name="maxTeachers" label={t("fields.maxTeachers")} type="number" dir="ltr" />
          <TextField control={form.control} name="maxStudents" label={t("fields.maxStudents")} type="number" dir="ltr" />
          <TextField control={form.control} name="maxFileMb" label={t("fields.maxFileMb")} type="number" dir="ltr" />
          <TextField control={form.control} name="storagePerTeacherMb" label={t("fields.storagePerTeacherMb")} type="number" dir="ltr" />
          <TextField control={form.control} name="sharedStorageMb" label={t("fields.sharedStorageMb")} type="number" dir="ltr" />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <Field orientation="horizontal" className="items-start rounded-xl border p-3">
              <Switch id="plan-public" checked={field.value} onCheckedChange={field.onChange} />
              <div className="space-y-0.5">
                <FieldLabel htmlFor="plan-public">{t("platform.plans.dialog.isPublic")}</FieldLabel>
                <FieldDescription>{t("platform.plans.dialog.isPublicHint")}</FieldDescription>
              </div>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Field orientation="horizontal" className="items-start rounded-xl border p-3">
              <Switch id="plan-active" checked={field.value} onCheckedChange={field.onChange} />
              <div className="space-y-0.5">
                <FieldLabel htmlFor="plan-active">{t("platform.plans.dialog.isActive")}</FieldLabel>
                <FieldDescription>{t("platform.plans.dialog.isActiveHint")}</FieldDescription>
              </div>
            </Field>
          )}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2Icon className="animate-spin" />}
          {plan ? t("common.actions.saveChanges") : t("common.actions.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
