"use client";

import { useState } from "react";
import { BarChart3Icon, PauseCircleIcon, PlayCircleIcon, UsersIcon } from "lucide-react";
import CrudPage from "@/components/crud-page";
import EnrollmentsDialog from "@/components/courses/enrollments-dialog";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-auth";
import { useI18n } from "@/i18n/provider";
import type { Course } from "@/lib/types";
import { courseSchema, courseUpdateSchema } from "@/lib/schemas";

export default function CoursesPage() {
  const { t, format } = useI18n();
  const { user } = useCurrentUser();
  const isStudent = user?.role === "STUDENT";
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
          {
            key: "price",
            label: t("fields.price"),
            render: (r) => (r.price == null ? "—" : t("courses.priceValue", { amount: format.number(Number(r.price)) })),
          },
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
          subject: r.subject ?? "",
          level: r.level ?? "",
          price: r.price == null ? "" : String(r.price),
          description: r.description ?? "",
          isActive: String(r.isActive),
        })}
        fields={[
          { name: "title", label: t("fields.courseTitle") },
          { name: "teacherId", label: t("fields.teacher"), type: "select", optionsFrom: { endpoint: "/teachers", labelKey: "user.fullName" }, createOnly: true },
          { name: "subject", label: t("fields.subject") },
          { name: "level", label: t("courses.form.level") },
          { name: "price", label: t("courses.form.price"), type: "number", dir: "ltr" },
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
