"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2Icon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import type { Role, SupportRequest } from "@/lib/types";

/** Who to enter as: a chosen member, or (without one) the center's first active admin. */
export type SupportTarget = { tenantId: string; tenantName: string; membership?: { id: string; name: string; role: Role } };

const DURATIONS = [15, 30, 60, 120];
const MIN_REASON = 5;

/** Super admin: ask a center's admin to let support in as one of its members. Nobody enters before they approve. */
export default function SupportDialog({ target, onClose }: { target: SupportTarget | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target?.membership ? t("support.request.titleAs", { name: target.membership.name }) : t("support.request.title", { center: target?.tenantName ?? "" })}
          </DialogTitle>
          <DialogDescription>{t("support.request.description")}</DialogDescription>
        </DialogHeader>
        {target && <RequestForm key={`${target.tenantId}:${target.membership?.id ?? ""}`} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RequestForm({ target, onDone }: { target: SupportTarget; onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState("60");
  const ready = reason.trim().length >= MIN_REASON;
  const send = useMutation({
    mutationFn: async () =>
      (
        await api.post<SupportRequest>("/support/requests", {
          tenantId: target.tenantId,
          membershipId: target.membership?.id,
          reason: reason.trim(),
          minutes: Number(minutes),
        })
      ).data,
    onSuccess: () => {
      toast.success(t("support.request.sent"), { description: t("support.request.sentHint") });
      qc.invalidateQueries({ queryKey: ["platform", "support"] });
      onDone();
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.actionFailed"))),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) send.mutate();
      }}
    >
      <ul className="list-disc space-y-1 rounded-xl border bg-muted/40 py-3 pe-3 ps-7 text-sm text-muted-foreground">
        <li>{t("support.request.consent")}</li>
        <li>{target.membership ? t("support.start.asMember", { role: t(`common.roles.${target.membership.role}`) }) : t("support.start.asOwner")}</li>
        <li>{t("support.start.logged")}</li>
        <li>{t("support.start.locked")}</li>
      </ul>
      <Field>
        <FieldLabel htmlFor="support-reason">{t("support.start.reason")}</FieldLabel>
        <Textarea id="support-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder={t("support.start.reasonPlaceholder")} required />
        <FieldDescription>{t("support.request.reasonHint")}</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="support-duration">{t("support.start.duration")}</FieldLabel>
        <Select value={minutes} onValueChange={setMinutes}>
          <SelectTrigger id="support-duration" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATIONS.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {t("support.start.minutes", { count: m })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="submit" variant="highlight" disabled={!ready || send.isPending}>
          {send.isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon data-icon="inline-start" className="rtl:-scale-x-100" />}
          {t("support.request.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
