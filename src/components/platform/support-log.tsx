"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDownIcon, CircleStopIcon, LifeBuoyIcon } from "lucide-react";
import { SupportStateBadge } from "@/components/support-state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStartSupport } from "@/hooks/use-auth";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PlatformSupportRequest, SupportAction, SupportSessionRow } from "@/lib/types";

/** Super admin: this center's support requests, with the way in once its admin approved one. */
export function SupportRequests({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  const q = useQuery({
    queryKey: ["platform", "support", "requests", tenantId],
    queryFn: async () => (await api.get<PlatformSupportRequest[]>("/support/requests", { params: { tenantId, take: 10 } })).data,
    // The center may answer at any moment.
    refetchInterval: 30_000,
  });
  if (!q.data) return <Skeleton className="h-16" />;
  if (q.data.length === 0) return <p className="text-sm text-muted-foreground">{t("support.requests.empty")}</p>;
  return (
    <ul className="divide-y rounded-xl border">
      {q.data.map((r) => (
        <RequestRow key={r.id} request={r} />
      ))}
    </ul>
  );
}

function RequestRow({ request: r }: { request: PlatformSupportRequest }) {
  const { t, rich, format } = useI18n();
  const qc = useQueryClient();
  const start = useStartSupport();
  const cancel = useMutation({
    mutationFn: () => api.post(`/support/requests/${r.id}/cancel`),
    onSuccess: () => {
      toast.success(t("support.requests.canceled"));
      qc.invalidateQueries({ queryKey: ["platform", "support"] });
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.actionFailed"))),
  });
  const open = r.state === "PENDING" || r.state === "APPROVED";

  return (
    <li className="space-y-1.5 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <SupportStateBadge state={r.state} />
        <span className="min-w-0 flex-1">
          {rich("support.requests.as", { target: <bdi className="font-medium">{r.targetName}</bdi>, role: t(`common.roles.${r.targetRole}`) })}
        </span>
      </div>
      <p className="text-muted-foreground">
        <bdi>{r.reason}</bdi>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground tabular-nums">
          {r.state === "PENDING"
            ? t("support.requests.waiting", { date: format.dateTime(r.createdAt) })
            : r.state === "APPROVED" && r.accessUntil
              ? rich("support.requests.openUntil", { name: <bdi>{r.decidedBy?.fullName}</bdi>, time: format.dateTime(r.accessUntil) })
              : t("support.requests.asked", { date: format.dateTime(r.createdAt) })}
        </p>
        {open && (
          <Button variant="ghost" size="xs" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            {t("support.requests.cancel")}
          </Button>
        )}
        {r.state === "APPROVED" && (
          <Button variant="highlight" size="xs" disabled={start.isPending} onClick={() => start.mutate(r.id)}>
            <LifeBuoyIcon data-icon="inline-start" /> {t("support.requests.enter")}
          </Button>
        )}
      </div>
    </li>
  );
}

/** Super admin: who from the platform entered this center, as whom, why, and what they changed. */
export function SupportLog({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  const q = useQuery({
    queryKey: ["platform", "support", tenantId],
    queryFn: async () => (await api.get<SupportSessionRow[]>("/support/sessions", { params: { tenantId, take: 20 } })).data,
  });
  if (!q.data) return <Skeleton className="h-16" />;
  if (q.data.length === 0) return <p className="text-sm text-muted-foreground">{t("support.log.empty")}</p>;
  return (
    <ul className="divide-y rounded-xl border">
      {q.data.map((s) => (
        <SessionRow key={s.id} session={s} />
      ))}
    </ul>
  );
}

function SessionRow({ session: s }: { session: SupportSessionRow }) {
  const { t, rich, format } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const end = useMutation({
    mutationFn: () => api.post(`/support/sessions/${s.id}/end`),
    onSuccess: () => {
      toast.success(t("support.log.endedToast"));
      qc.invalidateQueries({ queryKey: ["platform", "support"] });
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.actionFailed"))),
  });

  return (
    <li className="space-y-1.5 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={s.active ? "highlight" : "secondary"}>{s.active ? t("support.log.active") : t("support.log.ended")}</Badge>
        <span className="min-w-0 flex-1">
          {rich("support.log.by", { actor: <bdi>{s.actor.fullName}</bdi>, target: <bdi className="font-medium">{s.targetName}</bdi>, role: t(`common.roles.${s.targetRole}`) })}
        </span>
        {s.active && (
          <Button variant="destructive-soft" size="xs" disabled={end.isPending} onClick={() => end.mutate()}>
            <CircleStopIcon data-icon="inline-start" /> {t("support.log.end")}
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        <bdi>{s.reason}</bdi>
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
        <span>{format.dateTime(s.startedAt)}</span>
        {s.actions > 0 ? (
          <button type="button" className="inline-flex items-center gap-1 font-medium text-primary hover:underline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {t("support.log.actions", { count: s.actions })}
            <ChevronDownIcon className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
        ) : (
          <span>{t("support.log.noActions")}</span>
        )}
      </div>
      {open && <ActionList sessionId={s.id} />}
    </li>
  );
}

function ActionList({ sessionId }: { sessionId: string }) {
  const { format } = useI18n();
  const q = useQuery({
    queryKey: ["platform", "support", "actions", sessionId],
    queryFn: async () => (await api.get<SupportAction[]>(`/support/sessions/${sessionId}/actions`)).data,
  });
  if (!q.data) return <Skeleton className="h-10" />;
  return (
    <ol className="space-y-1 rounded-lg bg-muted/50 p-2 font-mono text-xs" dir="ltr">
      {q.data.map((a) => (
        <li key={a.id} className="flex gap-2">
          <span className="text-muted-foreground tabular-nums">{format.time(a.createdAt)}</span>
          <span className="font-semibold">{a.method}</span>
          <span className="min-w-0 flex-1 truncate">{a.path}</span>
          <span className={a.status >= 400 ? "text-destructive" : "text-success"}>{a.status}</span>
        </li>
      ))}
    </ol>
  );
}
