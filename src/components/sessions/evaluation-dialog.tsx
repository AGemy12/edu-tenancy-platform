"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookMarkedIcon, ClipboardCheckIcon, FlagIcon, Loader2Icon, MessageSquareTextIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AttendanceStatus, LiveSession, SessionAttendee, SessionDetail } from "@/lib/types";

const STATUSES: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];
const STATUS_TONE: Record<AttendanceStatus, { active: string; badge: "success" | "warning" | "destructive" | "info" }> = {
  PRESENT: { active: "border-success bg-success/15 text-success", badge: "success" },
  LATE: { active: "border-warning bg-warning/20 text-warning-foreground dark:text-warning", badge: "warning" },
  ABSENT: { active: "border-destructive bg-destructive/10 text-destructive", badge: "destructive" },
  // Absent with leave: not counted against the student in reports.
  EXCUSED: { active: "border-info bg-info/15 text-info", badge: "info" },
};
/** Rating colors: strong (8–10), fair (5–7), weak (1–4). */
const ratingTone = (r: number) => (r >= 8 ? "bg-success text-success-foreground" : r >= 5 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground");

/**
 * - `edit`: the session's teacher records each student's attendance, a rating out of 10, homework,
 *   where the lesson stopped and a note (the API accepts it from that teacher only).
 * - `mine`: a student reads their own evaluation.
 * - `review`: an admin reads every student's evaluation, without changing it.
 */
export type EvaluationMode = "edit" | "mine" | "review";

export default function EvaluationDialog({
  session,
  mode,
  onClose,
}: {
  session: LiveSession | null;
  mode: EvaluationMode;
  onClose: () => void;
}) {
  const { t, format } = useI18n();
  return (
    <Dialog open={Boolean(session)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "mine" ? t("sessions.evaluation.mineTitle") : t("sessions.evaluation.title")} · <bdi>{session?.title}</bdi>
          </DialogTitle>
          <DialogDescription>
            {session && <span className="block tabular-nums">{format.longDateTime(session.startAt)}</span>}
            {mode === "edit" && t("sessions.evaluation.description")}
            {mode === "review" && t("sessions.evaluation.reviewDescription")}
          </DialogDescription>
        </DialogHeader>
        {session &&
          (mode === "edit" ? (
            <EvaluationForm sessionId={session.id} onDone={onClose} />
          ) : mode === "review" ? (
            <EvaluationReview sessionId={session.id} onDone={onClose} />
          ) : (
            <MyEvaluation sessionId={session.id} />
          ))}
      </DialogContent>
    </Dialog>
  );
}

function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => (await api.get<SessionDetail>(`/sessions/${sessionId}`)).data,
  });
}

/* ───────── teacher ───────── */

type Draft = {
  status: AttendanceStatus | null;
  rating: number | null;
  hasHomework: boolean;
  homework: string;
  progress: string;
  comment: string;
};

const toDraft = (a: SessionAttendee): Draft => ({
  // Not evaluated yet: someone who joined the meeting starts as present.
  status: a.status ?? (a.attended ? "PRESENT" : null),
  rating: a.rating,
  hasHomework: Boolean(a.homework),
  homework: a.homework ?? "",
  progress: a.progress ?? "",
  comment: a.comment ?? "",
});

function EvaluationForm({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const detail = useSessionDetail(sessionId);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [showErrors, setShowErrors] = useState(false);
  const attendees = detail.data?.attendees ?? [];
  const draftOf = (a: SessionAttendee) => drafts[a.studentId] ?? toDraft(a);
  const patch = (a: SessionAttendee, p: Partial<Draft>) => setDrafts((d) => ({ ...d, [a.studentId]: { ...draftOf(a), ...p } }));

  const save = useMutation({
    mutationFn: async (evaluations: object[]) => (await api.post<SessionDetail>(`/sessions/${sessionId}/evaluations`, { evaluations })).data,
    onSuccess: (data) => {
      toast.success(t("sessions.evaluation.saved"));
      qc.setQueryData(["session", sessionId], data);
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      onDone();
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const rows = attendees.map((a) => ({ a, d: draftOf(a) })).filter(({ d }) => d.status);
    if (rows.length === 0) {
      toast.error(t("sessions.evaluation.needsStatus"));
      return;
    }
    if (rows.some(({ d }) => d.hasHomework && !d.homework.trim())) {
      setShowErrors(true);
      toast.error(t("common.toast.checkFields"));
      return;
    }
    save.mutate(
      rows.map(({ a, d }) => ({
        studentId: a.studentId,
        status: d.status,
        rating: d.status === "ABSENT" || d.status === "EXCUSED" ? undefined : (d.rating ?? undefined),
        homework: d.hasHomework ? d.homework.trim() : "",
        progress: d.progress.trim(),
        comment: d.comment.trim(),
      })),
    );
  }

  if (detail.isPending) return <Skeleton className="h-80 rounded-2xl" />;
  if (attendees.length === 0) return <Empty icon={UsersIcon} title={t("sessions.evaluation.empty")} />;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {attendees.map((a) => (
        <StudentCard key={a.studentId} attendee={a} draft={draftOf(a)} onChange={(p) => patch(a, p)} showErrors={showErrors} />
      ))}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2Icon className="animate-spin" />}
          {t("sessions.evaluation.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function StudentCard({
  attendee: a,
  draft: d,
  onChange,
  showErrors,
}: {
  attendee: SessionAttendee;
  draft: Draft;
  onChange: (p: Partial<Draft>) => void;
  showErrors: boolean;
}) {
  const { t, format } = useI18n();
  const id = (field: string) => `${field}-${a.studentId}`;
  const absent = d.status === "ABSENT" || d.status === "EXCUSED";
  const homeworkMissing = showErrors && d.hasHomework && !d.homework.trim();

  return (
    <fieldset className="space-y-4 rounded-2xl border bg-background/60 p-4">
      <legend className="sr-only">{a.student.user.fullName}</legend>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold">
            <bdi>{a.student.user.fullName}</bdi>
          </p>
          <p className="text-xs text-muted-foreground">
            {a.joinedAt
              ? t("sessions.evaluation.joined", { time: format.time(a.joinedAt) })
              : a.evaluatedAt
                ? t("sessions.evaluation.evaluatedAt", { date: format.dateTime(a.evaluatedAt) })
                : t("sessions.evaluation.notEvaluated")}
          </p>
        </div>
        <div role="radiogroup" aria-label={t("sessions.evaluation.statusLabel")} className="inline-flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = d.status === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ status: s })}
                className={cn(
                  "h-8 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  active ? STATUS_TONE[s].active : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {t(`sessions.evaluation.status.${s}`)}
              </button>
            );
          })}
        </div>
      </div>

      {!absent && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("sessions.evaluation.rating")}</p>
          <div role="radiogroup" aria-label={t("sessions.evaluation.rating")} className="flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => {
              const active = d.rating === r;
              return (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={t("sessions.evaluation.ratingOption", { rating: r })}
                  onClick={() => onChange({ rating: active ? null : r })}
                  className={cn(
                    "size-9 rounded-full border text-sm font-semibold tabular-nums transition-all",
                    active ? cn("scale-110 border-transparent shadow-sm", ratingTone(r)) : "hover:bg-muted",
                    d.rating !== null && !active && r < d.rating && "border-primary/40 bg-primary/10",
                  )}
                >
                  {format.number(r)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch id={id("hw")} checked={d.hasHomework} onCheckedChange={(on) => onChange({ hasHomework: on })} />
          <label htmlFor={id("hw")} className="text-sm font-medium">
            {t("sessions.evaluation.homeworkToggle")}
          </label>
        </div>
        {d.hasHomework && (
          <div>
            <Textarea
              aria-label={t("sessions.evaluation.homework")}
              aria-invalid={homeworkMissing}
              placeholder={t("sessions.evaluation.homeworkPlaceholder")}
              rows={2}
              dir="auto"
              maxLength={1000}
              value={d.homework}
              onChange={(e) => onChange({ homework: e.target.value })}
            />
            {homeworkMissing && <p className="mt-1 text-xs text-destructive">{t("sessions.evaluation.homeworkRequired")}</p>}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={id("progress")} className="text-sm font-medium">
            {t("sessions.evaluation.progress")}
          </label>
          <Input
            id={id("progress")}
            placeholder={t("sessions.evaluation.progressPlaceholder")}
            dir="auto"
            maxLength={500}
            value={d.progress}
            onChange={(e) => onChange({ progress: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={id("comment")} className="text-sm font-medium">
            {t("sessions.evaluation.comment")}
          </label>
          <Input
            id={id("comment")}
            placeholder={t("sessions.evaluation.commentPlaceholder")}
            dir="auto"
            maxLength={2000}
            value={d.comment}
            onChange={(e) => onChange({ comment: e.target.value })}
          />
        </div>
      </div>
    </fieldset>
  );
}

/* ───────── read-only ───────── */

function MyEvaluation({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const detail = useSessionDetail(sessionId);
  const mine = detail.data?.attendees[0];

  if (detail.isPending) return <Skeleton className="h-56 rounded-2xl" />;
  if (!mine?.status) {
    return <Empty icon={ClipboardCheckIcon} title={t("sessions.evaluation.pending")} hint={t("sessions.evaluation.pendingHint")} />;
  }
  return <EvaluationSummary attendee={mine} status={mine.status} />;
}

/** An admin's view: every student's evaluation as the teacher left it. */
function EvaluationReview({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const { t, format } = useI18n();
  const detail = useSessionDetail(sessionId);
  const attendees = detail.data?.attendees ?? [];
  const done = attendees.filter((a) => a.status).length;

  if (detail.isPending) return <Skeleton className="h-80 rounded-2xl" />;
  if (attendees.length === 0) return <Empty icon={UsersIcon} title={t("sessions.evaluation.empty")} />;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted-foreground">
        {t("sessions.evaluation.reviewSummary", { done: format.number(done), total: format.number(attendees.length) })}
      </p>
      {attendees.map((a) => (
        <section key={a.studentId} className="space-y-3 rounded-2xl border bg-background/60 p-4">
          <h3 className="truncate text-base font-bold">
            <bdi>{a.student.user.fullName}</bdi>
          </h3>
          {a.status ? (
            <EvaluationSummary attendee={a} status={a.status} />
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClipboardCheckIcon className="size-4 shrink-0" aria-hidden="true" />
              {t("sessions.evaluation.teacherPending")}
            </p>
          )}
        </section>
      ))}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.actions.close")}
        </Button>
      </DialogFooter>
    </div>
  );
}

/** One evaluated student: status, rating, then homework, progress and the teacher's note. */
function EvaluationSummary({ attendee: a, status }: { attendee: SessionAttendee; status: AttendanceStatus }) {
  const { t, format } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-background/60 p-4">
        {a.rating != null && (
          <span
            className={cn("flex size-16 shrink-0 flex-col items-center justify-center rounded-full shadow-sm", ratingTone(a.rating))}
            aria-label={t("sessions.evaluation.ratingValue", { rating: a.rating })}
          >
            <span className="text-2xl leading-none font-bold tabular-nums">{format.number(a.rating)}</span>
            <span className="text-[0.65rem] opacity-90 tabular-nums" aria-hidden="true">
              / {format.number(10)}
            </span>
          </span>
        )}
        <div className="space-y-1">
          <Badge variant={STATUS_TONE[status].badge}>{t(`sessions.evaluation.status.${status}`)}</Badge>
          {a.evaluatedAt && (
            <p className="text-xs text-muted-foreground">{t("sessions.evaluation.evaluatedAt", { date: format.dateTime(a.evaluatedAt) })}</p>
          )}
        </div>
      </div>
      <dl className="space-y-3">
        <Detail icon={BookMarkedIcon} label={t("sessions.evaluation.homework")} highlight={Boolean(a.homework)}>
          {a.homework ?? <span className="text-muted-foreground">{t("sessions.evaluation.homeworkNone")}</span>}
        </Detail>
        {a.progress && (
          <Detail icon={FlagIcon} label={t("sessions.evaluation.progress")}>
            {a.progress}
          </Detail>
        )}
        {a.comment && (
          <Detail icon={MessageSquareTextIcon} label={t("sessions.evaluation.comment")}>
            {a.comment}
          </Detail>
        )}
      </dl>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  highlight,
  children,
}: {
  icon: typeof FlagIcon;
  label: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex gap-3 rounded-xl border p-3", highlight && "border-highlight/50 bg-highlight/8")}>
      <Icon className={cn("mt-0.5 size-4.5 shrink-0", highlight ? "text-highlight-foreground dark:text-highlight" : "text-muted-foreground")} aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm whitespace-pre-line">
          <bdi>{children}</bdi>
        </dd>
      </div>
    </div>
  );
}

function Empty({ icon: Icon, title, hint }: { icon: typeof FlagIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="font-semibold">{title}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
