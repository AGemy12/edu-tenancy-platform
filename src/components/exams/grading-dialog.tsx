"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardListIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Exam, ExamRosterRow } from "@/lib/types";

/** One sheet for the whole class: a mark (and an optional note) per enrolled student. */
export default function GradingDialog({ exam, onClose }: { exam: Exam | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={Boolean(exam)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("exams.grading.title")} · <bdi>{exam?.title}</bdi>
          </DialogTitle>
          <DialogDescription>
            {exam &&
              t("exams.grading.description", { course: exam.course.title, total: exam.totalMarks })}
          </DialogDescription>
        </DialogHeader>
        {exam && <GradingSheet exam={exam} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

type Draft = Record<string, { score: string; feedback: string }>;

function GradingSheet({ exam, onDone }: { exam: Exam; onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const roster = useQuery({
    queryKey: ["exam-roster", exam.id],
    queryFn: async () => (await api.get<ExamRosterRow[]>(`/exams/${exam.id}/roster`)).data,
  });
  // Edits on top of the saved marks; untouched rows keep what the server has.
  const [draft, setDraft] = useState<Draft>({});
  const rows = (roster.data ?? []).map((r) => ({
    ...r,
    scoreText: draft[r.studentId]?.score ?? (r.score == null ? "" : String(r.score)),
    feedbackText: draft[r.studentId]?.feedback ?? r.feedback ?? "",
  }));

  const invalid = (text: string) => {
    if (text.trim() === "") return false;
    const n = Number(text);
    return !Number.isFinite(n) || n < 0 || n > exam.totalMarks;
  };
  const hasInvalid = rows.some((r) => invalid(r.scoreText));

  const save = useMutation({
    mutationFn: async () => {
      const results = rows
        .filter((r) => r.scoreText.trim() !== "")
        .map((r) => ({ studentId: r.studentId, score: Number(r.scoreText), feedback: r.feedbackText.trim() || undefined }));
      return (await api.post<ExamRosterRow[]>(`/exams/${exam.id}/results/bulk`, { results })).data;
    },
    onSuccess: (data) => {
      toast.success(t("exams.grading.saved"));
      qc.setQueryData(["exam-roster", exam.id], data);
      qc.invalidateQueries({ queryKey: ["list"] });
      onDone();
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))),
  });

  const set = (studentId: string, patch: Partial<{ score: string; feedback: string }>, current: { score: string; feedback: string }) =>
    setDraft((d) => ({ ...d, [studentId]: { ...current, ...d[studentId], ...patch } }));

  if (roster.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ClipboardListIcon className="size-5" aria-hidden="true" />
        </span>
        <p className="font-semibold">{t("exams.grading.empty")}</p>
        <p className="text-sm text-muted-foreground">{t("exams.grading.emptyHint")}</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!hasInvalid) save.mutate();
      }}
      noValidate
    >
      <div className="overflow-hidden rounded-xl border">
        <div className="hidden grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground sm:grid">
          <span>{t("exams.grading.student")}</span>
          <span>{t("exams.grading.score")}</span>
          <span>{t("exams.grading.feedback")}</span>
        </div>
        <ul className="divide-y">
          {rows.map((r) => {
            const current = { score: r.scoreText, feedback: r.feedbackText };
            const bad = invalid(r.scoreText);
            return (
              <li key={r.studentId} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] sm:items-center sm:gap-3">
                <span className="truncate font-medium">
                  <bdi>{r.name}</bdi>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={exam.totalMarks}
                      step="0.5"
                      dir="ltr"
                      className={cn("w-20 tabular-nums", bad && "border-destructive")}
                      aria-label={`${t("exams.grading.score")} – ${r.name}`}
                      aria-invalid={bad}
                      value={r.scoreText}
                      onChange={(e) => set(r.studentId, { score: e.target.value }, current)}
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t("exams.grading.outOf", { total: exam.totalMarks })}
                    </span>
                  </div>
                  {bad && <p className="mt-1 text-xs text-destructive">{t("exams.grading.invalid", { total: exam.totalMarks })}</p>}
                </div>
                <Input
                  aria-label={`${t("exams.grading.feedback")} – ${r.name}`}
                  placeholder={t("exams.grading.feedbackPlaceholder")}
                  value={r.feedbackText}
                  maxLength={500}
                  onChange={(e) => set(r.studentId, { feedback: e.target.value }, current)}
                />
              </li>
            );
          })}
        </ul>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="submit" disabled={hasInvalid || save.isPending}>
          {save.isPending && <Loader2Icon className="animate-spin" />}
          {t("common.actions.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
