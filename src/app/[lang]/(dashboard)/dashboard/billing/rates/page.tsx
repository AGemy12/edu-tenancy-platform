"use client";

import { ArrowLeftIcon } from "lucide-react";
import CrudPage from "@/components/crud-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBillingOptions } from "@/hooks/use-billing";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import type { BillingRate, Course, RateBasis, RateKind } from "@/lib/types";
import { rateSchema, rateUpdateSchema, toLocalDateInput } from "@/lib/schemas";

const KINDS: RateKind[] = ["STUDENT_FEE", "TEACHER_PAY"];
const BASES: RateBasis[] = ["PER_HOUR", "PERCENT"];
const STATE_VARIANT = { ACTIVE: "success", SCHEDULED: "info", SUPERSEDED: "secondary" } as const;

export default function BillingRatesPage() {
  const { t, rich, format } = useI18n();
  const { user } = useCurrentUser();
  const options = useBillingOptions();
  const currency = options.data?.currency ?? "EGP";
  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "SUPER_ADMIN";

  const value = (r: BillingRate) =>
    r.basis === "PERCENT"
      ? t("billing.percent", { percent: format.number(r.amount) })
      : t("billing.perHour", { amount: format.money(r.amount, currency) });

  const appliesTo = (r: BillingRate) => {
    const course = r.course && <bdi className="font-medium">{r.course.title}</bdi>;
    const student = r.student && <bdi className="font-medium">{r.student.name}</bdi>;
    if (course && student) return rich("billing.rates.scope.COURSE_STUDENT", { course, student });
    if (course) return rich("billing.rates.scope.COURSE", { course });
    if (student) return rich("billing.rates.scope.STUDENT", { student });
    return <span className="text-muted-foreground">{t("billing.rates.scope.TEACHER")}</span>;
  };

  return (
    <CrudPage<BillingRate>
      title={t("billing.rates.title")}
      description={isAdmin ? t("billing.rates.description") : t("billing.rates.readOnly")}
      endpoint="/billing/rates"
      createLabel={t("billing.rates.create")}
      canCreate={isAdmin}
      canDelete={isAdmin}
      emptyTitle={t("billing.rates.emptyTitle")}
      emptyText={isAdmin ? t("billing.rates.emptyText") : undefined}
      rowLabel={(r) => `${t(`billing.rates.kind.${r.kind}`)} · ${r.teacher.name}`}
      deleteText={() => t("billing.rates.deleteText")}
      extraActions={
        <Button asChild variant="outline">
          <Link href="/dashboard/billing">
            <ArrowLeftIcon data-icon="inline-start" className="rtl:rotate-180" /> {t("billing.rates.back")}
          </Link>
        </Button>
      }
      columns={[
        { key: "teacher.name", label: t("fields.teacher"), className: "font-semibold" },
        {
          key: "kind",
          label: t("billing.rates.columns.kind"),
          render: (r) => <Badge variant={r.kind === "STUDENT_FEE" ? "info" : "coral"}>{t(`billing.rates.kind.${r.kind}`)}</Badge>,
        },
        { key: "appliesTo", label: t("billing.rates.columns.appliesTo"), render: appliesTo },
        {
          key: "amount",
          label: t("billing.rates.columns.value"),
          render: (r) => (
            <span className="font-semibold tabular-nums">
              <bdi>{value(r)}</bdi>
            </span>
          ),
        },
        {
          key: "effectiveFrom",
          label: t("billing.rates.columns.effectiveFrom"),
          render: (r) => <span className="tabular-nums">{format.date(r.effectiveFrom)}</span>,
        },
        {
          key: "state",
          label: t("billing.rates.columns.state"),
          render: (r) => (r.state ? <Badge variant={STATE_VARIANT[r.state]}>{t(`billing.rates.state.${r.state}`)}</Badge> : "—"),
        },
        { key: "note", label: t("billing.rates.form.note"), className: "hidden" },
      ]}
      schema={rateSchema}
      updateSchema={isAdmin ? rateUpdateSchema : undefined}
      toForm={(r) => ({
        basis: r.basis,
        amount: String(r.amount),
        effectiveFrom: toLocalDateInput(r.effectiveFrom),
        note: r.note ?? "",
      })}
      fields={[
        {
          name: "kind",
          label: t("fields.rateKind"),
          type: "select",
          options: KINDS.map((k) => ({ value: k, label: t(`billing.rates.kind.${k}`) })),
          createOnly: true,
        },
        { name: "basis", label: t("fields.rateBasis"), type: "select", options: BASES.map((b) => ({ value: b, label: t(`billing.rates.basis.${b}`) })) },
        { name: "teacherId", label: t("fields.teacher"), type: "select", optionsFrom: { endpoint: "/teachers", labelKey: "user.fullName" }, createOnly: true },
        {
          name: "courseId",
          label: t("billing.rates.form.course"),
          type: "select",
          hint: t("billing.rates.form.courseHint"),
          optionsFrom: { endpoint: "/courses", labelKey: (c) => `${(c as Course).title} · ${(c as Course).teacher.user.fullName}` },
          createOnly: true,
        },
        {
          name: "studentId",
          label: t("billing.rates.form.student"),
          type: "select",
          hint: t("billing.rates.form.studentHint"),
          optionsFrom: { endpoint: "/students", labelKey: "user.fullName" },
          createOnly: true,
        },
        { name: "amount", label: t("fields.amount"), type: "number", dir: "ltr", hint: t("billing.rates.form.amountHint") },
        { name: "effectiveFrom", label: t("fields.effectiveFrom"), type: "date", dir: "ltr", hint: t("billing.rates.form.effectiveHint") },
        { name: "note", label: t("billing.rates.form.note"), type: "textarea" },
      ]}
    />
  );
}
