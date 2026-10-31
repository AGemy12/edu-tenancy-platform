"use client";

import { ArrowLeftIcon, HandCoinsIcon, TagsIcon } from "lucide-react";
import CrudPage from "@/components/crud-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBillingOptions } from "@/hooks/use-billing";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import type { BillingRate, Course, RateBasis, RateKind } from "@/lib/types";
import { rateSchema, rateUpdateSchema, toLocalDateInput } from "@/lib/schemas";

const BASES: Record<RateKind, RateBasis[]> = {
  STUDENT_FEE: ["PER_HOUR", "PER_SESSION"],
  TEACHER_PAY: ["PER_HOUR", "PER_SESSION", "PERCENT"],
};
const STATE_VARIANT = { ACTIVE: "success", SCHEDULED: "info", SUPERSEDED: "secondary" } as const;

/**
 * One side of the rate card: the center's price list for students, or what it pays teachers.
 * Both read the same `/billing/rates` list and show only their kind.
 */
export function RateCardPage({ kind }: { kind: RateKind }) {
  const { t, rich, format } = useI18n();
  const { user } = useCurrentUser();
  const options = useBillingOptions();
  const currency = options.data?.currency ?? "EGP";
  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "SUPER_ADMIN";
  const isPay = kind === "TEACHER_PAY";
  const ns = isPay ? "billing.rates.pay" : "billing.rates.prices";

  const value = (r: BillingRate) =>
    r.basis === "PERCENT"
      ? t("billing.percent", { percent: format.number(r.amount) })
      : t(r.basis === "PER_SESSION" ? "billing.perSession" : "billing.perHour", { amount: format.money(r.amount, currency) });

  const appliesTo = (r: BillingRate) => {
    const course = r.course && <bdi className="font-medium">{r.course.title}</bdi>;
    const student = r.student && <bdi className="font-medium">{r.student.name}</bdi>;
    const teacher = r.teacher && <bdi className="font-medium">{r.teacher.name}</bdi>;
    if (isPay) {
      return course ? rich("billing.rates.scope.COURSE", { course }) : <span className="text-muted-foreground">{t("billing.rates.scope.TEACHER")}</span>;
    }
    const scope =
      course && student
        ? rich("billing.rates.scope.COURSE_STUDENT", { course, student })
        : course
          ? rich("billing.rates.scope.COURSE", { course })
          : student
            ? rich("billing.rates.scope.STUDENT", { student })
            : teacher
              ? rich("billing.rates.scope.TEACHER_SESSIONS", { teacher })
              : <span className="text-muted-foreground">{t("billing.rates.scope.CENTER")}</span>;
    // A course or student price narrowed to one teacher's sessions.
    const narrowed = teacher && (course || student) && <span className="text-xs text-muted-foreground"> · {rich("billing.rates.scope.withTeacher", { teacher })}</span>;
    return (
      <>
        {scope}
        {narrowed}
      </>
    );
  };

  const rowLabel = (r: BillingRate) => (isPay ? r.teacher?.name ?? t(`${ns}.title`) : `${t(`${ns}.title`)} · ${value(r)}`);

  return (
    <CrudPage<BillingRate>
      title={t(`${ns}.title`)}
      description={isAdmin ? t(`${ns}.description`) : t(`${ns}.readOnly`)}
      endpoint="/billing/rates"
      filter={(r) => r.kind === kind}
      defaults={{ kind }}
      createLabel={t(`${ns}.create`)}
      canCreate={isAdmin}
      canDelete={isAdmin}
      emptyTitle={t(`${ns}.emptyTitle`)}
      emptyText={isAdmin ? t(`${ns}.emptyText`) : undefined}
      rowLabel={rowLabel}
      deleteText={() => t(`${ns}.deleteText`)}
      extraActions={
        <>
          <Button asChild variant="outline">
            <Link href={isPay ? "/dashboard/billing/rates" : "/dashboard/billing/pay"}>
              {isPay ? <TagsIcon data-icon="inline-start" /> : <HandCoinsIcon data-icon="inline-start" />}
              {isPay ? t("billing.rates.pay.prices") : t("billing.rates.prices.pay")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/billing">
              <ArrowLeftIcon data-icon="inline-start" className="rtl:rotate-180" /> {t("billing.rates.back")}
            </Link>
          </Button>
        </>
      }
      columns={[
        ...(isPay
          ? [{ key: "teacher.name", label: t("fields.teacher"), className: "font-semibold", render: (r: BillingRate) => <bdi className="font-semibold">{r.teacher?.name ?? "—"}</bdi> }]
          : []),
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
        ...(isPay
          ? [{ name: "teacherId", label: t("fields.teacher"), type: "select" as const, optionsFrom: { endpoint: "/teachers", labelKey: "user.fullName" }, createOnly: true }]
          : []),
        {
          name: "basis",
          label: t("fields.rateBasis"),
          type: "select",
          options: BASES[kind].map((b) => ({ value: b, label: t(`billing.rates.basis.${b}`) })),
        },
        { name: "amount", label: t("fields.amount"), type: "number", dir: "ltr", hint: t(`${ns}.form.amountHint`) },
        {
          name: "courseId",
          label: t(`${ns}.form.course`),
          type: "select",
          hint: t(`${ns}.form.courseHint`),
          optionsFrom: { endpoint: "/courses", labelKey: (c) => `${(c as Course).title} · ${(c as Course).teacher.user.fullName}` },
          createOnly: true,
        },
        ...(isPay
          ? []
          : [
              {
                name: "studentId",
                label: t("billing.rates.prices.form.student"),
                type: "select" as const,
                hint: t("billing.rates.prices.form.studentHint"),
                optionsFrom: { endpoint: "/students", labelKey: "user.fullName" },
                createOnly: true,
              },
              {
                name: "teacherId",
                label: t("billing.rates.prices.form.teacher"),
                type: "select" as const,
                hint: t("billing.rates.prices.form.teacherHint"),
                optionsFrom: { endpoint: "/teachers", labelKey: "user.fullName" },
                createOnly: true,
              },
            ]),
        { name: "effectiveFrom", label: t("fields.effectiveFrom"), type: "date", dir: "ltr", hint: t("billing.rates.form.effectiveHint") },
        { name: "note", label: t("billing.rates.form.note"), type: "textarea" },
      ]}
    />
  );
}
