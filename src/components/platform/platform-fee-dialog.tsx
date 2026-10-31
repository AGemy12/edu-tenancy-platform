"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import type { PlatformTenant } from "@/lib/types";

/** Who the commission is for: one center, or many (chosen, all, or all but the chosen). */
export type PlatformFeeTarget = { kind: "single"; tenant: PlatformTenant } | { kind: "bulk"; selected: PlatformTenant[] };

type Scope = "all" | "selected" | "except";

/**
 * Super admin: set or remove the platform's commission. One center from its row menu, or in bulk
 * from the toolbar: every center, only the ticked ones, or every center except the ticked ones.
 */
export default function PlatformFeeDialog({ target, onClose }: { target: PlatformFeeTarget | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target?.kind === "single" ? (
              t("platform.fee.single", { name: target.tenant.name })
            ) : (
              t("platform.fee.title")
            )}
          </DialogTitle>
          <DialogDescription>{t("platform.fee.description")}</DialogDescription>
        </DialogHeader>
        {target && <FeeForm key={target.kind === "single" ? target.tenant.id : "bulk"} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function FeeForm({ target, onDone }: { target: PlatformFeeTarget; onDone: () => void }) {
  const { t, format } = useI18n();
  const qc = useQueryClient();
  const single = target.kind === "single" ? target.tenant : null;
  const selected = target.kind === "bulk" ? target.selected : [];
  const [percent, setPercent] = useState(single?.platformFeePercent != null ? String(single.platformFeePercent) : "");
  const [remove, setRemove] = useState(Boolean(single && single.platformFeePercent === null));
  const [scope, setScope] = useState<Scope>(selected.length ? "selected" : "all");
  const value = Number(percent);
  const valid = remove || (percent.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= 100 && /^\d{1,3}(\.\d{1,2})?$/.test(percent.trim()));

  const save = useMutation({
    mutationFn: async () => {
      const body = { percent: remove ? null : value };
      if (single) return (await api.patch<{ platformFeePercent: number | null }>(`/tenants/${single.id}/platform-fee`, body)).data;
      const ids = selected.map((s) => s.id);
      const res = await api.patch<{ updated: number }>("/tenants/platform-fee", {
        ...body,
        ...(scope === "selected" ? { tenantIds: ids } : scope === "except" ? { except: ids } : {}),
      });
      return res.data;
    },
    onSuccess: (res) => {
      if (single) toast.success(t("platform.fee.saved"));
      else {
        const count = (res as { updated: number }).updated;
        toast.success(remove ? t("platform.fee.removed", { count }) : t("platform.fee.applied", { count }));
      }
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["platform"] });
      onDone();
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))),
  });

  const scopes: Scope[] = selected.length ? ["selected", "except", "all"] : ["all"];

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save.mutate();
      }}
    >
      {!single && (
        <Field>
          <FieldLabel htmlFor="fee-scope">{t("platform.fee.scope")}</FieldLabel>
          <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
            <SelectTrigger id="fee-scope" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scopes.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(s === "all" ? "platform.fee.scopeAll" : s === "selected" ? "platform.fee.scopeSelected" : "platform.fee.scopeExcept")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{t("platform.fee.selected", { count: selected.length })}</FieldDescription>
        </Field>
      )}
      <Field orientation="horizontal" className="items-start rounded-xl border p-3">
        <Switch id="fee-remove" checked={remove} onCheckedChange={setRemove} />
        <div className="space-y-0.5">
          <FieldLabel htmlFor="fee-remove">{t("platform.fee.remove")}</FieldLabel>
          <FieldDescription>{t("platform.fee.removeHint")}</FieldDescription>
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor="fee-percent">{t("platform.fee.percent")}</FieldLabel>
        <div className="relative">
          <Input
            id="fee-percent"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            dir="ltr"
            value={percent}
            disabled={remove}
            onChange={(e) => setPercent(e.target.value)}
            className="pe-8"
            aria-invalid={!remove && percent !== "" && !valid}
          />
          <span className="pointer-events-none absolute inset-e-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
        </div>
        <FieldDescription>
          {t("platform.fee.percentHint")}
          {single && (
            <>
              {" · "}
              {t("platform.fee.current", {
                value: single.platformFeePercent === null ? t("platform.noFee") : t("platform.feePercent", { percent: format.number(single.platformFeePercent) }),
              })}
            </>
          )}
        </FieldDescription>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending || !valid}>
          {save.isPending && <Loader2Icon className="animate-spin" />}
          {single ? t("common.actions.save") : t("platform.fee.apply")}
        </Button>
      </DialogFooter>
    </form>
  );
}
