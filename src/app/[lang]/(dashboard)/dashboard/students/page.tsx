"use client";

import { useState } from "react";
import { BarChart3Icon, CalendarClockIcon } from "lucide-react";
import { AccountStatusBadge, AccountStatusDialog, accountStatusActions, type StatusChange } from "@/components/account-status";
import CrudPage from "@/components/crud-page";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "@/i18n/navigation";
import { useT } from "@/i18n/provider";
import type { Student } from "@/lib/types";
import { studentSchema, studentUpdateSchema } from "@/lib/schemas";

export default function StudentsPage() {
  const t = useT();
  const router = useRouter();
  const [statusChange, setStatusChange] = useState<StatusChange | null>(null);

  // Anyone with sessions, grades, schedules or courses stays (suspended at most): the API refuses to delete them.
  const hasRecord = (r: Student) =>
    Boolean(r._count && r._count.enrollments + r._count.attendances + r._count.examResults + r._count.schedules + r._count.billingRates > 0);

  return (
    <>
    <CrudPage<Student>
      title={t("students.title")}
      description={t("students.description")}
      endpoint="/students"
      createLabel={t("students.create")}
      emptyTitle={t("students.emptyTitle")}
      emptyText={t("students.emptyText")}
      rowLabel={(r) => r.user.fullName}
      canDelete={(r) => !hasRecord(r)}
      columns={[
        { key: "user.fullName", label: t("fields.name"), className: "font-semibold" },
        { key: "user.email", label: t("students.columns.email"), render: (r) => <span dir="ltr">{r.user.email}</span> },
        { key: "grade", label: t("students.columns.grade") },
        { key: "parentPhone", label: t("fields.parentPhone"), render: (r) => <span dir="ltr">{r.parentPhone ?? "—"}</span> },
        {
          key: "teachers",
          label: t("students.columns.teachers"),
          render: (r) => (
            <div className="flex flex-wrap gap-1">
              {r.teachers.length === 0
                ? "—"
                : r.teachers.map((x) => <Badge key={x.teacher.id} variant="secondary">{x.teacher.user.fullName}</Badge>)}
            </div>
          ),
        },
        { key: "_count.enrollments", label: t("students.columns.courses") },
        {
          key: "user.status",
          label: t("fields.accountStatus"),
          render: (r) => <AccountStatusBadge status={r.membership.status} reason={r.membership.statusReason} />,
        },
      ]}
      schema={studentSchema}
      updateSchema={studentUpdateSchema}
      toForm={(r) => ({
        fullName: r.user.fullName,
        phone: r.user.phone ?? "",
        grade: r.grade ?? "",
        parentPhone: r.parentPhone ?? "",
        notes: r.notes ?? "",
      })}
      fields={[
        { name: "fullName", label: t("fields.fullName") },
        { name: "email", label: t("fields.email"), type: "email", dir: "ltr", createOnly: true },
        { name: "password", label: t("fields.password"), type: "password", dir: "ltr", hint: t("students.form.passwordHint"), createOnly: true },
        { name: "phone", label: t("fields.phone"), dir: "ltr" },
        { name: "grade", label: t("fields.grade") },
        { name: "parentPhone", label: t("fields.parentPhone"), dir: "ltr" },
        { name: "teacherId", label: t("fields.teacher"), type: "select", optionsFrom: { endpoint: "/teachers", labelKey: "user.fullName" }, createOnly: true },
        { name: "notes", label: t("fields.notes"), type: "textarea" },
      ]}
      rowActions={(r) => [
        { label: t("students.actions.report"), icon: BarChart3Icon, href: `/dashboard/reports/student?id=${r.id}` },
        {
          label: t("students.actions.schedule"),
          icon: CalendarClockIcon,
          onClick: () => router.push(`/dashboard/schedules?student=${r.id}`),
        },
        ...accountStatusActions({ id: r.id, name: r.user.fullName, status: r.membership.status }, setStatusChange, t),
      ]}
    />
    <AccountStatusDialog endpoint="/students" change={statusChange} onClose={() => setStatusChange(null)} />
    </>
  );
}
