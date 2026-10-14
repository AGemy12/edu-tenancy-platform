"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BanIcon, Loader2Icon, PauseCircleIcon, PlayCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { RowAction } from "@/components/row-actions";
import { useT } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import type { AccountStatus } from "@/lib/types";

/**
 * A member's account state (see the API's auth/account-status): ACTIVE, SUSPENDED (signs in,
 * read-only) or BLOCKED (can't sign in). Set by the center admin for teachers and students, and
 * by a teacher for their own students.
 */

const TONE: Record<AccountStatus, "success" | "warning" | "destructive"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  BLOCKED: "destructive",
};

export function AccountStatusBadge({ status, reason }: { status: AccountStatus; reason?: string | null }) {
  const t = useT();
  return (
    <Badge variant={TONE[status]} title={reason ?? undefined}>
      {t(`common.account.status.${status}`)}
    </Badge>
  );
}

export type StatusChange = { id: string; name: string; status: AccountStatus; to: AccountStatus };

/** The row-menu entries that lead to the dialog: suspend and block, or reactivate. */
export function accountStatusActions(
  row: { id: string; name: string; status: AccountStatus },
  open: (change: StatusChange) => void,
  t: ReturnType<typeof useT>,
): RowAction[] {
  const go = (to: AccountStatus) => () => open({ ...row, to });
  if (row.status !== "ACTIVE") {
    return [{ label: t("common.account.reactivate"), icon: PlayCircleIcon, onClick: go("ACTIVE") }];
  }
  return [
    { label: t("common.account.suspend"), icon: PauseCircleIcon, onClick: go("SUSPENDED") },
    { label: t("common.account.block"), icon: BanIcon, variant: "destructive", onClick: go("BLOCKED") },
  ];
}

/** Confirms the change and, when suspending or blocking, asks why (the member sees the reason). */
export function AccountStatusDialog({
  endpoint,
  change,
  onClose,
}: {
  /** "/teachers" or "/students"; the status route is `${endpoint}/${id}/status`. */
  endpoint: string;
  change: StatusChange | null;
  onClose: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const to = change?.to ?? "ACTIVE";

  const save = useMutation({
    mutationFn: async (c: StatusChange) =>
      (await api.patch(`${endpoint}/${c.id}/status`, { status: c.to, reason: c.to === "ACTIVE" ? undefined : reason.trim() || undefined })).data,
    onSuccess: () => {
      toast.success(t(`common.account.done.${to}`));
      qc.invalidateQueries({ queryKey: ["list"] });
      close();
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.actionFailed"))),
  });

  function close() {
    setReason("");
    onClose();
  }

  return (
    <Dialog open={Boolean(change)} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`common.account.title.${to}`)}</DialogTitle>
          <DialogDescription>{change && t(`common.account.text.${to}`, { name: change.name })}</DialogDescription>
        </DialogHeader>
        {to !== "ACTIVE" && (
          <Field>
            <FieldLabel htmlFor="account-status-reason">{t("common.account.reason")}</FieldLabel>
            <Textarea
              id="account-status-reason"
              rows={3}
              maxLength={500}
              dir="auto"
              placeholder={t("common.account.reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <FieldDescription>{t("common.account.reasonHint")}</FieldDescription>
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t("common.actions.cancel")}
          </Button>
          <Button variant={to === "BLOCKED" ? "destructive" : "default"} disabled={save.isPending} onClick={() => change && save.mutate(change)}>
            {save.isPending && <Loader2Icon className="animate-spin" />}
            {t(`common.account.confirm.${to}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
