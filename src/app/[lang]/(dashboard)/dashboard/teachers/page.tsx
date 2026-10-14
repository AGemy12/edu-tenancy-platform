"use client";

import { useState } from "react";
import { Loader2Icon, UserRoundPlusIcon } from "lucide-react";
import { AccountStatusBadge, AccountStatusDialog, accountStatusActions, type StatusChange } from "@/components/account-status";
import CrudPage from "@/components/crud-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCreate, useList } from "@/hooks/use-resources";
import { useI18n } from "@/i18n/provider";
import type { Teacher } from "@/lib/types";
import { teacherSchema, teacherUpdateSchema } from "@/lib/schemas";

export default function TeachersPage() {
  const { t, locale } = useI18n();
  const { user } = useCurrentUser();
  // Same query key as the table, so this reads the cached list.
  const list = useList<Teacher>("/teachers");
  const addSelf = useCreate("/teachers/me", { successMessage: t("teachers.self.added") });
  const isSelf = (r: Teacher) => r.user.id === user?.id;
  const [statusChange, setStatusChange] = useState<StatusChange | null>(null);
  const canAddSelf = user?.role === "TENANT_ADMIN" && list.isSuccess && !list.data.some(isSelf);
  // Anyone who taught anything stays (suspended at most): the API refuses to delete them.
  const hasRecord = (r: Teacher) => Boolean(r._count && r._count.courses + r._count.sessions + r._count.exams + r._count.schedules + r._count.billingRates > 0);

  return (
    <>
    <CrudPage<Teacher>
      title={t("teachers.title")}
      description={t("teachers.description")}
      endpoint="/teachers"
      createLabel={t("teachers.create")}
      emptyTitle={t("teachers.emptyTitle")}
      emptyText={t("teachers.emptyText")}
      rowLabel={(r) => r.user.fullName}
      extraActions={
        canAddSelf && (
          <Button variant="outline" disabled={addSelf.isPending} onClick={() => addSelf.mutate({})}>
            {addSelf.isPending ? <Loader2Icon className="animate-spin" /> : <UserRoundPlusIcon data-icon="inline-start" />}
            {t("teachers.self.add")}
          </Button>
        )
      }
      canDelete={(r) => !hasRecord(r)}
      deleteText={(r) => (isSelf(r) ? t("teachers.self.removeText") : undefined)}
      columns={[
        {
          key: "user.fullName",
          label: t("fields.name"),
          className: "font-semibold",
          render: (r) => (
            <span className="inline-flex items-center gap-2">
              <bdi>{r.user.fullName}</bdi>
              {isSelf(r) && <Badge variant="secondary">{t("teachers.self.badge")}</Badge>}
            </span>
          ),
        },
        { key: "user.email", label: t("teachers.columns.email"), render: (r) => <span dir="ltr">{r.user.email}</span> },
        { key: "user.phone", label: t("fields.phone"), render: (r) => <span dir="ltr">{r.user.phone ?? "—"}</span> },
        {
          key: "subjects",
          label: t("fields.subjects"),
          render: (r) => (
            <div className="flex flex-wrap gap-1">
              {r.subjects.length === 0 ? "—" : r.subjects.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          ),
        },
        { key: "_count.courses", label: t("teachers.columns.courses") },
        { key: "_count.students", label: t("teachers.columns.students") },
        {
          key: "user.status",
          label: t("fields.accountStatus"),
          render: (r) => <AccountStatusBadge status={r.membership.status} reason={r.membership.statusReason} />,
        },
      ]}
      schema={teacherSchema}
      updateSchema={teacherUpdateSchema}
      toForm={(r) => ({
        fullName: r.user.fullName,
        phone: r.user.phone ?? "",
        bio: r.bio ?? "",
        // The schema splits on both Latin and Arabic (U+060C) commas; join with the one the user types.
        subjects: r.subjects.join(locale === "ar" ? "، " : ", "),
      })}
      fields={[
        { name: "fullName", label: t("fields.fullName") },
        { name: "email", label: t("fields.email"), type: "email", dir: "ltr", createOnly: true },
        { name: "password", label: t("fields.password"), type: "password", dir: "ltr", hint: t("teachers.form.passwordHint"), createOnly: true },
        { name: "phone", label: t("fields.phone"), dir: "ltr" },
        { name: "subjects", label: t("teachers.form.subjects"), placeholder: t("teachers.form.subjectsPlaceholder") },
        { name: "bio", label: t("fields.bio"), type: "textarea" },
      ]}
      rowActions={(r) =>
        // The admin's own account can't be suspended or blocked from here.
        r.membership.role !== "TEACHER" ? [] : accountStatusActions({ id: r.id, name: r.user.fullName, status: r.membership.status }, setStatusChange, t)
      }
    />
    <AccountStatusDialog endpoint="/teachers" change={statusChange} onClose={() => setStatusChange(null)} />
    </>
  );
}
