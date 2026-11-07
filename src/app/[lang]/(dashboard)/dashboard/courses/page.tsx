"use client";

import { useState } from "react";
import { BarChart3Icon, PauseCircleIcon, PlayCircleIcon, UsersIcon } from "lucide-react";
import CrudPage from "@/components/crud-page";
import EnrollmentsDialog from "@/components/courses/enrollments-dialog";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBillingOptions } from "@/hooks/use-billing";
import { useI18n } from "@/i18n/provider";
import type { Course } from "@/lib/types";
import { courseSchema, courseUpdateSchema } from "@/lib/schemas";

export default function CoursesPage() {
  const { t, format } = useI18n();
  const { user } = useCurrentUser();
  const isStudent = user?.role === "STUDENT";
  // The center sets prices: only its admin sees the field; teachers see the price, students don't.
  const isAdmin = user?.role === "TENANT_ADMIN";
  const currency = useBillingOptions().data?.currency ?? "EGP";
  const [students, setStudents] = useState<Course | null>(null);

  return (
    <>
      <CrudPage<Course>
        title={t("courses.title")}
        description={t("courses.description")}
        endpoint="/courses"
        createLabel={t("courses.create")}
        emptyTitle={t("courses.emptyTitle")}
        emptyText={t("courses.emptyText")}
        canCreate={!isStudent}
        canDelete={!isStudent}
        rowLabel={(r) => r.title}
        columns={[
          { key: "title", label: t("fields.title"), className: "font-semibold" },
          { key: "subject", label: t("fields.subject"), render: (r) => (r.subject ? <Badge variant="secondary">{r.subject}</Badge> : "—") },
          { key: "level", label: t("fields.level") },
          { key: "teacher.user.fullName", label: t("fields.teacher") },
          ...(isStudent
            ? []
            : [
                {
                  key: "sessionPrice",
                  label: t("courses.columns.sessionPrice"),
                  render: (r: Course) =>
                    r.sessionPrice == null ? (
                      <span className="text-muted-foreground">{t("courses.priceDefault")}</span>
                    ) : (
                      <span className="font-semibold tabular-nums">
                        <bdi>{t("billing.perSession", { amount: format.money(r.sessionPrice, currency) })}</bdi>
                      </span>
                    ),
                },
              ]),
          { key: "_count.enrollments", label: t("courses.columns.enrolled") },
          {
            key: "isActive",
            label: t("fields.status"),
            render: (r) =>
              r.isActive ? (
                <Badge variant="success">{t("common.labels.active")}</Badge>
              ) : (
                <Badge variant="outline">{t("common.labels.inactive")}</Badge>
              ),
          },
        ]}
        schema={courseSchema}
        updateSchema={isStudent ? undefined : courseUpdateSchema}
        toForm={(r) => ({
          title: r.title,
          teacherId: r.teacher.id,
          subject: r.subject ?? "",
          level: r.level ?? "",
          ...(isAdmin ? { sessionPrice: r.sessionPrice == null ? "" : String(r.sessionPrice) } : {}),
          description: r.description ?? "",
          isActive: String(r.isActive),
        })}
        fields={[
          { name: "title", label: t("fields.courseTitle") },
          {
            name: "teacherId",
            label: t("fields.teacher"),
            type: "select",
            optionsFrom: { endpoint: "/teachers", labelKey: "user.fullName" },
            // Sessions, exams and schedules are recorded under the course's teacher.
            locked: (r) =>
              !isAdmin
                ? t("courses.form.teacherByCenter")
                : Boolean(r._count && r._count.sessions + r._count.exams + r._count.schedules > 0) && t("courses.form.teacherLocked"),
          },
          { name: "subject", label: t("fields.subject") },
          { name: "level", label: t("courses.form.level") },
          ...(isAdmin
            ? [
                {
                  name: "sessionPrice",
                  label: t("courses.form.sessionPrice", { currency }),
                  type: "number" as const,
                  dir: "ltr" as const,
                  hint: t("courses.form.sessionPriceHint"),
                },
              ]
            : []),
          {
            name: "isActive",
            label: t("fields.status"),
            type: "select",
            options: [
              { value: "true", label: t("common.labels.active") },
              { value: "false", label: t("common.labels.inactive") },
            ],
            editOnly: true,
          },
          { name: "description", label: t("fields.description"), type: "textarea" },
        ]}
        rowActions={(r, h) =>
          isStudent
            ? []
            : [
                { label: t("courses.actions.students"), icon: UsersIcon, onClick: () => setStudents(r) },
                { label: t("courses.actions.report"), icon: BarChart3Icon, href: `/dashboard/reports/course?id=${r.id}` },
                r.isActive
                  ? { label: t("courses.actions.deactivate"), icon: PauseCircleIcon, onClick: () => h.update(r.id, { isActive: false }) }
                  : { label: t("courses.actions.activate"), icon: PlayCircleIcon, onClick: () => h.update(r.id, { isActive: true }) },
              ]
        }
      />
      <EnrollmentsDialog course={students} onClose={() => setStudents(null)} />
    </>
  );
}
