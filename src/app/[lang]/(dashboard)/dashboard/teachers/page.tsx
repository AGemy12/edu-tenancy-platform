"use client";

import { useState } from "react";
import { BarChart3Icon, BellRingIcon, CheckIcon, LinkIcon, Loader2Icon, MinusIcon, UserRoundPlusIcon } from "lucide-react";
import { AccountStatusBadge, AccountStatusDialog, accountStatusActions, type StatusChange } from "@/components/account-status";
import CrudPage from "@/components/crud-page";
import { accountKey, useMeetingReminder, type HostedProvider } from "@/components/sessions/meeting-account-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBillingOptions } from "@/hooks/use-billing";
import { useCreate, useIntegrations, useList } from "@/hooks/use-resources";
import { useI18n } from "@/i18n/provider";
import type { Teacher } from "@/lib/types";
import { teacherSchema, teacherUpdateSchema } from "@/lib/schemas";

const HOSTED: HostedProvider[] = ["ZOOM", "GOOGLE_MEET"];

export default function TeachersPage() {
  const { t, locale, format } = useI18n();
  const currency = useBillingOptions().data?.currency ?? "EGP";
  const { user } = useCurrentUser();
  // Same query key as the table, so this reads the cached list.
  const list = useList<Teacher>("/teachers");
  const addSelf = useCreate("/teachers/me", { successMessage: t("teachers.self.added") });
  const isSelf = (r: Teacher) => r.user.id === user?.id;
  const [statusChange, setStatusChange] = useState<StatusChange | null>(null);
  const canAddSelf = user?.role === "TENANT_ADMIN" && list.isSuccess && !list.data.some(isSelf);
  // Anyone who taught anything stays (suspended at most): the API refuses to delete them.
  const hasRecord = (r: Teacher) => Boolean(r._count && r._count.courses + r._count.sessions + r._count.exams + r._count.schedules + r._count.billingRates > 0);
  // Zoom and Meet sessions run on their teacher's own account: the admin sees who linked one, and asks the rest.
  const integrations = useIntegrations();
  const remind = useMeetingReminder();
  const hosted = HOSTED.filter((p) => integrations.data?.[accountKey(p)].configured);
  const missing = (r: Teacher) => (r.meetingAccounts ? hosted.filter((p) => !r.meetingAccounts![accountKey(p)]) : []);

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
        {
          key: "pay",
          label: t("teachers.columns.pay"),
          render: (r) =>
            r.pay ? (
              <span className="font-semibold tabular-nums">
                <bdi>
                  {r.pay.basis === "PERCENT"
                    ? t("billing.prices.teachers.percent", { percent: format.number(r.pay.amount) })
                    : t("billing.prices.teachers.fixed", { amount: format.money(r.pay.amount, currency) })}
                </bdi>
              </span>
            ) : (
              <span className="text-muted-foreground">{t("billing.prices.teachers.none")}</span>
            ),
        },
        { key: "_count.students", label: t("teachers.columns.students") },
        {
          key: "user.status",
          label: t("fields.accountStatus"),
          render: (r) => <AccountStatusBadge status={r.membership.status} reason={r.membership.statusReason} />,
        },
        ...(hosted.length && list.data?.some((r) => r.meetingAccounts)
          ? [
              {
                key: "meetingAccounts",
                label: t("teachers.columns.meetingAccounts"),
                render: (r: Teacher) => (
                  <div className="flex flex-wrap gap-1">
                    {hosted.map((p) => {
                      const linked = Boolean(r.meetingAccounts?.[accountKey(p)]);
                      const account = t(`teachers.meeting.accounts.${p}`);
                      return (
                        <Badge key={p} variant={linked ? "success" : "outline"} className={linked ? undefined : "text-muted-foreground"}>
                          {linked ? <CheckIcon aria-hidden="true" /> : <MinusIcon aria-hidden="true" />}
                          <span dir="ltr">{account}</span>
                          <span className="sr-only">{t(linked ? "teachers.meeting.linked" : "teachers.meeting.missing")}</span>
                        </Badge>
                      );
                    })}
                  </div>
                ),
              },
            ]
          : []),
      ]}
      schema={teacherSchema}
      updateSchema={teacherUpdateSchema}
      toForm={(r) => ({
        fullName: r.user.fullName,
        email: r.user.email,
        phone: r.user.phone ?? "",
        bio: r.bio ?? "",
        // The schema splits on both Latin and Arabic (U+060C) commas; join with the one the user types.
        subjects: r.subjects.join(locale === "ar" ? "، " : ", "),
        payBasis: r.pay?.basis ?? "PER_SESSION",
        payAmount: r.pay ? String(r.pay.amount) : "",
      })}
      defaults={{ payBasis: "PER_SESSION" }}
      fields={[
        { name: "fullName", label: t("fields.fullName") },
        { name: "email", label: t("fields.email"), type: "email", dir: "ltr", locked: (r) => r.accountLock && t(`common.accountLock.${r.accountLock}`) },
        { name: "password", label: t("fields.password"), type: "password", dir: "ltr", hint: t("teachers.form.passwordHint"), createOnly: true },
        {
          name: "password",
          label: t("fields.password"),
          type: "password",
          dir: "ltr",
          hint: t("teachers.form.passwordEditHint"),
          editOnly: true,
          locked: (r) => r.accountLock && t(`common.accountLock.${r.accountLock}`),
        },
        { name: "phone", label: t("fields.phone"), dir: "ltr" },
        { name: "subjects", label: t("teachers.form.subjects"), placeholder: t("teachers.form.subjectsPlaceholder") },
        {
          name: "payBasis",
          label: t("fields.payBasis"),
          type: "select",
          options: [
            { value: "PER_SESSION", label: t("billing.prices.dialog.fixed") },
            { value: "PERCENT", label: t("billing.prices.dialog.share") },
          ],
        },
        { name: "payAmount", label: t("fields.sessionPay"), type: "number", dir: "ltr", hint: t("teachers.form.payHint", { currency }) },
        { name: "bio", label: t("fields.bio"), type: "textarea" },
      ]}
      rowActions={(r) => [
        { label: t("teachers.actions.report"), icon: BarChart3Icon, href: `/dashboard/reports/teacher?id=${r.id}` },
        // Only the teacher can link their account: the admin links their own in settings, and reminds the others.
        ...(isSelf(r)
          ? missing(r).length
            ? [{ label: t("teachers.meeting.linkYours"), icon: LinkIcon, href: "/dashboard/settings" }]
            : []
          : missing(r).map((p) => ({
              label: t("teachers.meeting.remind", { provider: t(`teachers.meeting.accounts.${p}`) }),
              icon: BellRingIcon,
              onClick: () => remind.mutate({ id: r.id, body: { provider: p } }),
            }))),
        // The admin's own account can't be suspended or blocked from here.
        ...(r.membership.role !== "TEACHER" ? [] : accountStatusActions({ id: r.id, name: r.user.fullName, status: r.membership.status }, setStatusChange, t)),
      ]}
    />
    <AccountStatusDialog endpoint="/teachers" change={statusChange} onClose={() => setStatusChange(null)} />
    </>
  );
}
