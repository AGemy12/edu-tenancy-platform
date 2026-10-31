"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckIcon, ChevronDownIcon, ShieldOffIcon, XIcon } from "lucide-react";
import { SettingsSection } from "@/components/settings-section";
import { SupportStateBadge } from "@/components/support-state-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CenterSupportRequest, SupportAction } from "@/lib/types";

const HOURS = [1, 4, 24, 72];
export const supportAccessKey = ["support-access"] as const;

/** The center's support requests (admins only; never in support mode, where the API refuses them). */
export function useSupportAccess(enabled = true) {
  return useQuery({
    queryKey: supportAccessKey,
    queryFn: async () => (await api.get<CenterSupportRequest[]>("/support/access")).data,
    enabled,
    refetchInterval: 60_000,
  });
}

/** Center admin: let platform support in (for a while), refuse, close it early, and see what was done. */
export function SupportAccess() {
  const { t } = useI18n();
  const q = useSupportAccess();
  return (
    <SettingsSection title={t("support.access.title")} description={t("support.access.description")}>
      <div id="support" className="scroll-mt-24">
        <Card className="gap-0 py-0">
          {!q.data ? (
            <Skeleton className="m-4 h-20" />
          ) : q.data.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{t("support.access.empty")}</p>
          ) : (
            <ul className="divide-y">
              {q.data.map((r) => (
                <AccessRow key={r.id} request={r} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </SettingsSection>
  );
}

function AccessRow({ request: r }: { request: CenterSupportRequest }) {
  const { t, rich, format } = useI18n();
  const qc = useQueryClient();
  const [hours, setHours] = useState("4");
  const decide = useMutation({
    mutationFn: (action: "approve" | "deny" | "revoke") => api.post(`/support/access/${r.id}/${action}`, action === "approve" ? { hours: Number(hours) } : undefined),
    onSuccess: (_res, action) => {
      toast.success(t(`support.access.done.${action}`));
      qc.invalidateQueries({ queryKey: supportAccessKey });
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.actionFailed"))),
  });

  return (
    <li className={cn("space-y-3 p-4", r.state === "PENDING" && "bg-warning/5")}>
      <div className="flex flex-wrap items-center gap-2">
        <SupportStateBadge state={r.state} />
        <p className="min-w-0 flex-1 basis-56 text-sm">
          {rich("support.access.asks", {
            actor: <bdi className="font-medium">{r.requestedBy.fullName}</bdi>,
            target: <bdi className="font-medium">{r.targetName}</bdi>,
            role: t(`common.roles.${r.targetRole}`),
          })}
        </p>
        <span className="text-xs text-muted-foreground tabular-nums">{format.dateTime(r.createdAt)}</span>
      </div>
      <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
        <bdi>{r.reason}</bdi>
      </p>

      {r.state === "PENDING" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("support.access.allowFor")}</span>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger size="sm" className="w-32" aria-label={t("support.access.allowFor")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {t("support.access.hours", { count: h })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate("approve")}>
            <CheckIcon data-icon="inline-start" /> {t("support.access.approve")}
          </Button>
          <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate("deny")}>
            <XIcon data-icon="inline-start" /> {t("support.access.deny")}
          </Button>
        </div>
      )}
      {r.state === "APPROVED" && r.accessUntil && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1 text-sm text-muted-foreground">{t("support.access.openUntil", { time: format.dateTime(r.accessUntil) })}</span>
          <Button size="sm" variant="destructive-soft" disabled={decide.isPending} onClick={() => decide.mutate("revoke")}>
            <ShieldOffIcon data-icon="inline-start" /> {t("support.access.revoke")}
          </Button>
        </div>
      )}
      {r.decidedBy && r.state !== "PENDING" && r.state !== "APPROVED" && (
        <p className="text-xs text-muted-foreground">{rich("support.access.decidedBy", { name: <bdi>{r.decidedBy.fullName}</bdi> })}</p>
      )}

      {r.sessions.length > 0 && (
        <ul className="space-y-1.5 border-s-2 ps-3">
          {r.sessions.map((s) => (
            <SessionLine key={s.id} session={s} />
          ))}
        </ul>
      )}
    </li>
  );
}

function SessionLine({ session: s }: { session: CenterSupportRequest["sessions"][number] }) {
  const { t, rich, format } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <li className="text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
        <span>
          {rich("support.access.session", { name: <bdi className="font-medium text-foreground">{s.actor.fullName}</bdi>, time: format.dateTime(s.startedAt) })}
          {s.active && <span className="ms-1.5 font-semibold text-success">{t("support.log.active")}</span>}
        </span>
        {s.actions > 0 ? (
          <button type="button" className="inline-flex items-center gap-1 font-medium text-primary hover:underline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {t("support.log.actions", { count: s.actions })}
            <ChevronDownIcon className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
        ) : (
          <span>{t("support.log.noActions")}</span>
        )}
      </div>
      {open && <Actions sessionId={s.id} />}
    </li>
  );
}

function Actions({ sessionId }: { sessionId: string }) {
  const { format } = useI18n();
  const q = useQuery({
    queryKey: [...supportAccessKey, "actions", sessionId],
    queryFn: async () => (await api.get<SupportAction[]>(`/support/access/sessions/${sessionId}/actions`)).data,
  });
  if (!q.data) return <Skeleton className="mt-1 h-8" />;
  return (
    <ol className="mt-1 space-y-1 rounded-lg bg-muted/50 p-2 font-mono" dir="ltr">
      {q.data.map((a) => (
        <li key={a.id} className="flex gap-2">
          <span className="tabular-nums">{format.time(a.createdAt)}</span>
          <span className="font-semibold text-foreground">{a.method}</span>
          <span className="min-w-0 flex-1 truncate">{a.path}</span>
          <span className={a.status >= 400 ? "text-destructive" : "text-success"}>{a.status}</span>
        </li>
      ))}
    </ol>
  );
}
