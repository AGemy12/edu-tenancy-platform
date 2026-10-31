"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BanIcon, CalendarDaysIcon, CheckCircle2Icon, ClipboardCheckIcon, EyeIcon, ListIcon, LogInIcon, VideoIcon } from "lucide-react";
import CrudPage from "@/components/crud-page";
import SessionCalendar, { Segmented } from "@/components/sessions/session-calendar";
import EvaluationDialog, { type EvaluationMode } from "@/components/sessions/evaluation-dialog";
import { MeetingAccountNotice } from "@/components/sessions/meeting-account-notice";
import type { RowAction } from "@/components/row-actions";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-auth";
import { useRowAction } from "@/hooks/use-resources";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { openMeeting } from "@/lib/open-meeting";
import type { LiveSession, SessionProvider, SessionStatus } from "@/lib/types";
import { sessionSchema, sessionUpdateSchema, toLocalDateTime } from "@/lib/schemas";

const PROVIDERS: SessionProvider[] = ["ZOOM", "GOOGLE_MEET", "MANUAL"];
const STATUS_VARIANT: Record<SessionStatus, "info" | "success" | "secondary" | "destructive" | "warning"> = {
  SCHEDULED: "info",
  LIVE: "success",
  COMPLETED: "secondary",
  CANCELED: "destructive",
  MISSED: "warning",
};

type View = "calendar" | "list";

export default function SessionsPage() {
  return (
    <Suspense>
      <Sessions />
    </Suspense>
  );
}

function Sessions() {
  const { t, format } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  // The calendar is the default; ?view=list keeps the table (and survives reloads and the back button).
  const view: View = useSearchParams().get("view") === "list" ? "list" : "calendar";
  const [evaluating, setEvaluating] = useState<{ session: LiveSession; mode: EvaluationMode } | null>(null);
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const cancel = useRowAction("/sessions", "cancel", { successMessage: t("sessions.toast.canceled") });
  const complete = useRowAction("/sessions", "complete", { successMessage: t("sessions.toast.ended") });
  const isStudent = user?.role === "STUDENT";
  // Suspended members read only: the API refuses every write and sends no meeting link.
  const suspended = user?.status === "SUSPENDED";

  async function enterMeeting(id: string, action: "start" | "join") {
    try {
      await openMeeting(async () => (await api.post<{ url: string }>(`/sessions/${id}/${action}`)).data);
      qc.invalidateQueries({ queryKey: ["list"] });
    } catch (e) {
      toast.error(getErrorMessage(e, t("sessions.toast.openFailed")));
    }
  }

  function actionsFor(r: LiveSession): RowAction[] {
    const isHost = r.teacher.userId === user?.id;
    const open = r.status === "SCHEDULED" || r.status === "LIVE";
    // Once a session has begun it can be evaluated; students and admins read, the teacher writes.
    const evaluable = r.status !== "CANCELED" && new Date(r.startAt) <= new Date();
    const actions: RowAction[] = [];
    if (suspended) {
      if (evaluable) {
        actions.push(
          isStudent
            ? { label: t("sessions.actions.myEvaluation"), icon: ClipboardCheckIcon, onClick: () => setEvaluating({ session: r, mode: "mine" }) }
            : { label: t("sessions.actions.viewEvaluation"), icon: EyeIcon, onClick: () => setEvaluating({ session: r, mode: "review" }) },
        );
      }
      return actions;
    }
    if (open && isHost) {
      actions.push({ label: t("sessions.actions.start"), icon: VideoIcon, onClick: () => enterMeeting(r.id, "start") });
    } else if (open) {
      actions.push({
        label: isStudent ? t("sessions.actions.join") : t("sessions.actions.watch"),
        icon: isStudent ? LogInIcon : EyeIcon,
        onClick: () => enterMeeting(r.id, "join"),
      });
    }
    // Once a session has begun its teacher evaluates it (attendance, rating, homework…); students read
    // their own, and admins read everyone's without changing it.
    if (isStudent) {
      if (evaluable) {
        actions.push({ label: t("sessions.actions.myEvaluation"), icon: ClipboardCheckIcon, onClick: () => setEvaluating({ session: r, mode: "mine" }) });
      }
      return actions;
    }
    if (evaluable) {
      actions.push(
        isHost
          ? { label: t("sessions.actions.evaluate"), icon: ClipboardCheckIcon, onClick: () => setEvaluating({ session: r, mode: "edit" }) }
          : { label: t("sessions.actions.viewEvaluation"), icon: EyeIcon, onClick: () => setEvaluating({ session: r, mode: "review" }) },
      );
    }
    if (r.status === "LIVE") {
      actions.push({ label: t("sessions.actions.end"), icon: CheckCircle2Icon, onClick: () => complete.mutate({ id: r.id }) });
    }
    if (r.status === "MISSED") {
      actions.push({ label: t("sessions.actions.markHeld"), icon: CheckCircle2Icon, onClick: () => complete.mutate({ id: r.id }) });
    }
    if (r.status === "SCHEDULED") {
      actions.push({
        label: t("sessions.actions.cancel"),
        icon: BanIcon,
        variant: "destructive",
        onClick: () => cancel.mutate({ id: r.id }),
      });
    }
    return actions;
  }

  return (
    <>
      <CrudPage<LiveSession>
        title={t("sessions.title")}
        description={t("sessions.description")}
        endpoint="/sessions"
        createLabel={t("sessions.create")}
        canCreate={!isStudent && !suspended}
        // Only a session that hasn't started can go; the rest is attendance, evaluation and billing history.
        canDelete={(r) => !isStudent && !suspended && r.status === "SCHEDULED" && new Date(r.startAt) > new Date()}
        emptyTitle={t("sessions.emptyTitle")}
        emptyText={t("sessions.emptyText")}
        rowLabel={(r) => r.title}
        columns={[
          { key: "title", label: t("fields.title"), className: "font-semibold" },
          { key: "teacher.user.fullName", label: t("fields.teacher") },
          { key: "course.title", label: t("fields.course") },
          { key: "startAt", label: t("sessions.columns.start"), render: (r) => <span className="tabular-nums">{format.dateTime(r.startAt)}</span> },
          {
            key: "endAt",
            label: t("sessions.columns.end"),
            render: (r) => <span className="tabular-nums">{format.dateTime(r.endAt)}</span>,
            className: "hidden xl:table-cell",
          },
          { key: "provider", label: t("sessions.columns.provider"), render: (r) => <Badge variant="outline">{t(`sessions.provider.${r.provider}`)}</Badge> },
          { key: "_count.attendees", label: t("sessions.columns.students") },
          {
            key: "status",
            label: t("fields.status"),
            render: (r) => (
              <Badge variant={STATUS_VARIANT[r.status]}>
                {r.status === "LIVE" && <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />}
                {t(`sessions.status.${r.status}`)}
              </Badge>
            ),
          },
          {
            key: "meetingUrl",
            label: t("sessions.columns.meetingUrl"),
            className: "hidden",
            render: (r) =>
              r.meetingUrl ? (
                <a href={r.meetingUrl} target="_blank" rel="noreferrer" dir="ltr" className="break-all text-primary underline underline-offset-4">
                  {r.meetingUrl}
                </a>
              ) : (
                "—"
              ),
          },
        ]}
        schema={sessionSchema}
        updateSchema={isStudent ? undefined : sessionUpdateSchema}
        toForm={(r) => ({
          title: r.title,
          description: r.description ?? "",
          startAt: toLocalDateTime(r.startAt),
          endAt: toLocalDateTime(r.endAt),
          meetingUrl: r.provider === "MANUAL" ? (r.meetingUrl ?? "") : "",
          notes: r.notes ?? "",
        })}
        fields={[
          { name: "title", label: t("fields.sessionTitle") },
          { name: "teacherId", label: t("fields.teacher"), type: "select", optionsFrom: { endpoint: "/teachers", labelKey: "user.fullName" }, createOnly: true },
          {
            name: "courseId",
            label: t("fields.course"),
            type: "select",
            optionsFrom: { endpoint: "/courses", labelKey: "title" },
            hint: t("sessions.form.courseHint"),
            createOnly: true,
          },
          {
            name: "studentId",
            label: t("sessions.form.student"),
            type: "select",
            optionsFrom: { endpoint: "/students", labelKey: "user.fullName" },
            createOnly: true,
          },
          {
            name: "provider",
            label: t("sessions.form.provider"),
            type: "select",
            options: PROVIDERS.map((p) => ({ value: p, label: t(`sessions.provider.${p}`) })),
            hint: t("sessions.form.providerHint"),
            createOnly: true,
          },
          { name: "startAt", label: t("fields.startAt"), type: "datetime-local", dir: "ltr" },
          { name: "endAt", label: t("fields.endAt"), type: "datetime-local", dir: "ltr" },
          { name: "meetingUrl", label: t("sessions.form.meetingUrl"), dir: "ltr", placeholder: "https://…", hint: t("sessions.form.meetingUrlHint") },
          { name: "description", label: t("fields.description"), type: "textarea" },
          { name: "notes", label: t("sessions.form.notes"), type: "textarea", editOnly: true },
        ]}
        formNotice={(v, mode) => mode === "create" && <MeetingAccountNotice provider={v.provider} teacherId={v.teacherId} />}
        rowActions={actionsFor}
        extraActions={
          <Segmented<View>
            label={t("sessions.calendar.viewsLabel")}
            value={view}
            onChange={(v) => router.replace(v === "list" ? `${pathname}?view=list` : pathname, { scroll: false })}
            options={[
              { value: "calendar", label: t("sessions.calendar.views.calendar"), icon: CalendarDaysIcon },
              { value: "list", label: t("sessions.calendar.views.list"), icon: ListIcon },
            ]}
          />
        }
        renderView={
          view === "calendar"
            ? ({ rows, loading, actionsFor: menu }) => <SessionCalendar sessions={rows} loading={loading} actionsFor={menu} />
            : undefined
        }
      />
      <EvaluationDialog session={evaluating?.session ?? null} mode={evaluating?.mode ?? "mine"} onClose={() => setEvaluating(null)} />
    </>
  );
}
