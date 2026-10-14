"use client";

import { useState } from "react";
import { ClipboardPenIcon, LockIcon, SendIcon } from "lucide-react";
import CrudPage from "@/components/crud-page";
import GradingDialog from "@/components/exams/grading-dialog";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-auth";
import { useI18n } from "@/i18n/provider";
import type { Exam, ExamStatus } from "@/lib/types";
import { examSchema, examUpdateSchema, toDateInput } from "@/lib/schemas";

const STATUS_VARIANT: Record<ExamStatus, "warning" | "success" | "secondary"> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  CLOSED: "secondary",
};
const STATUSES = Object.keys(STATUS_VARIANT) as ExamStatus[];

export default function ExamsPage() {
  const { t, format } = useI18n();
  const { user } = useCurrentUser();
  const isStudent = user?.role === "STUDENT";
  const [grading, setGrading] = useState<Exam | null>(null);

  // Students see their own mark; teachers and admins see how many are graded.
  const resultColumn = isStudent
    ? {
        key: "results",
        label: t("exams.columns.myScore"),
        render: (r: Exam) => {
          const mine = r.results?.[0];
          return mine ? (
            <span className="font-semibold tabular-nums">
              {t("exams.myScore", { score: format.number(Number(mine.score)), total: format.number(r.totalMarks) })}
            </span>
          ) : (
            <span className="text-muted-foreground">{t("exams.notGraded")}</span>
          );
        },
      }
    : { key: "_count.results", label: t("exams.columns.results") };

  return (
    <>
      <CrudPage<Exam>
        title={t("exams.title")}
        description={t("exams.description")}
        endpoint="/exams"
        createLabel={t("exams.create")}
        emptyTitle={t("exams.emptyTitle")}
        emptyText={t("exams.emptyText")}
        canCreate={!isStudent}
        canDelete={!isStudent}
        rowLabel={(r) => r.title}
        columns={[
          { key: "title", label: t("fields.title"), className: "font-semibold" },
          { key: "course.title", label: t("fields.course") },
          { key: "teacher.user.fullName", label: t("fields.teacher") },
          { key: "month", label: t("fields.month"), render: (r) => format.month(r.month) },
          { key: "totalMarks", label: t("fields.totalMarks") },
          resultColumn,
          {
            key: "status",
            label: t("fields.status"),
            render: (r) => <Badge variant={STATUS_VARIANT[r.status]}>{t(`exams.status.${r.status}`)}</Badge>,
          },
        ]}
        schema={examSchema}
        updateSchema={isStudent ? undefined : examUpdateSchema}
        toForm={(r) => ({
          title: r.title,
          month: toDateInput(r.month),
          totalMarks: String(r.totalMarks),
          status: r.status,
        })}
        fields={[
          { name: "title", label: t("fields.examTitle") },
          { name: "courseId", label: t("fields.course"), type: "select", optionsFrom: { endpoint: "/courses", labelKey: "title" }, createOnly: true },
          { name: "month", label: t("fields.month"), type: "date", dir: "ltr", hint: t("exams.form.monthHint") },
          { name: "totalMarks", label: t("fields.totalMarks"), type: "number", dir: "ltr" },
          {
            name: "status",
            label: t("fields.status"),
            type: "select",
            options: STATUSES.map((s) => ({ value: s, label: t(`exams.status.${s}`) })),
            editOnly: true,
          },
          { name: "description", label: t("fields.description"), type: "textarea" },
        ]}
        rowActions={(r, h) =>
          isStudent
            ? []
            : [
                { label: t("exams.actions.grade"), icon: ClipboardPenIcon, onClick: () => setGrading(r) },
                ...(r.status === "DRAFT"
                  ? [{ label: t("exams.actions.publish"), icon: SendIcon, onClick: () => h.update(r.id, { status: "PUBLISHED" }) }]
                  : []),
                ...(r.status === "PUBLISHED"
                  ? [{ label: t("exams.actions.close"), icon: LockIcon, onClick: () => h.update(r.id, { status: "CLOSED" }) }]
                  : []),
              ]
        }
      />
      <GradingDialog exam={grading} onClose={() => setGrading(null)} />
    </>
  );
}
