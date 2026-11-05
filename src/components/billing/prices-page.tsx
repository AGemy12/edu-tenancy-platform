"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  BadgePercentIcon,
  BookOpenIcon,
  HandCoinsIcon,
  LandmarkIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import { RowActions, type RowAction } from "@/components/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCurrentUser } from "@/hooks/use-auth";
import { usePrices, useSetPrice } from "@/hooks/use-billing";
import { useUpdate } from "@/hooks/use-resources";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import type { CenterPrices, CourseDetail, RateBasis, TeacherPay } from "@/lib/types";

/** What the edit dialog is changing. */
type Editing =
  | { kind: "default" }
  | { kind: "course"; course: CenterPrices["courses"][number] }
  | { kind: "teacher"; teacher: CenterPrices["teachers"][number] }
  | { kind: "special"; row?: CenterPrices["special"][number]; courseId?: string };

const AMOUNT = /^\d{1,8}(\.\d{1,2})?$/;

/**
 * The center's prices in one place: what a session costs in each course, special prices for some
 * students, what each teacher earns per session, and the rules (default price, absences). Teachers
 * see their courses' prices and their own pay, read-only.
 */
export function PricesPage() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "TENANT_ADMIN";
  const prices = usePrices();
  const [editing, setEditing] = useState<Editing | null>(null);
  const data = prices.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t("billing.prices.title")}</h1>
          <p className="text-muted-foreground">{t(isAdmin ? "billing.prices.description.admin" : "billing.prices.description.teacher")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/billing">
            <ArrowLeftIcon data-icon="inline-start" className="rtl:rotate-180" /> {t("billing.prices.back")}
          </Link>
        </Button>
      </div>

      {prices.isError && <p className="text-destructive">{getErrorMessage(prices.error, t("billing.loadFailed"))}</p>}

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {isAdmin && <Example data={data} />}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <CoursesCard data={data} canEdit={isAdmin} onEdit={setEditing} />
            <div className="space-y-4">
              <TeachersCard data={data} canEdit={isAdmin} onEdit={setEditing} />
              <SpecialCard data={data} canEdit={isAdmin} onEdit={setEditing} />
            </div>
          </div>
          <RulesCard data={data} canEdit={isAdmin} onEdit={setEditing} />
        </>
      )}

      {data && <EditDialog editing={editing} data={data} onClose={() => setEditing(null)} />}
    </div>
  );
}

function usePay(currency: string) {
  const { t, format } = useI18n();
  return (pay: TeacherPay) =>
    pay.basis === "PERCENT"
      ? t("billing.prices.teachers.percent", { percent: format.number(pay.amount) })
      : t("billing.prices.teachers.fixed", { amount: format.money(pay.amount, currency) });
}

/** One session split between the teacher, the platform and the center, from a real course. */
function Example({ data }: { data: CenterPrices }) {
  const { t, format } = useI18n();
  const money = (n: number) => format.money(n, data.currency);
  const course = data.courses.find((c) => c.price !== null && data.teachers.find((x) => x.id === c.teacher.id)?.pay);
  const percent = data.platformFeePercent ?? null;

  if (!course || course.price === null) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-5 text-sm text-muted-foreground">
          <SparklesIcon className="size-5 shrink-0" aria-hidden="true" />
          {t("billing.prices.example.empty")}
        </CardContent>
      </Card>
    );
  }
  const pay = data.teachers.find((x) => x.id === course.teacher.id)!.pay!;
  const priceCents = Math.round(course.price * 100);
  const payCents = pay.basis === "PERCENT" ? Math.round((priceCents * pay.amount) / 100) : Math.round(pay.amount * 100);
  const feeCents = percent ? Math.round((priceCents * percent) / 100) : 0;
  const netCents = priceCents - payCents - feeCents;
  const parts = [
    { key: "teacher", label: t("billing.prices.example.teacher"), cents: payCents, icon: HandCoinsIcon, tone: "bg-warning/20 text-warning-foreground dark:text-warning" },
    ...(percent
      ? [{ key: "platform", label: t("billing.prices.example.platform", { percent: format.number(percent) }), cents: feeCents, icon: BadgePercentIcon, tone: "bg-destructive/10 text-destructive" }]
      : []),
    { key: "center", label: t("billing.prices.example.center"), cents: netCents, icon: LandmarkIcon, tone: "bg-success/15 text-success" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("billing.prices.example.title")}</CardTitle>
        <CardDescription>
          {t("billing.prices.example.course")} <bdi className="font-medium text-foreground">{course.title}</bdi>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm text-muted-foreground">{t("billing.prices.example.price")}</span>
          <span className="text-2xl font-bold tabular-nums" dir="ltr">
            <bdi>{money(course.price)}</bdi>
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {parts.map((p) => (
            <div key={p.key} className={p.tone.split(" ")[0]} style={{ width: `${Math.max(0, (p.cents / priceCents) * 100)}%` }} />
          ))}
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          {parts.map((p) => (
            <div key={p.key} className="flex items-center gap-3 rounded-xl border px-3 py-2.5">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${p.tone}`}>
                <p.icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{p.label}</dt>
                <dd className="font-semibold tabular-nums" dir="ltr">
                  <bdi>{money(p.cents / 100)}</bdi>
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, hint, action }: { icon: typeof BookOpenIcon; title: string; hint: string; action?: React.ReactNode }) {
  return (
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{hint}</CardDescription>
        </div>
      </div>
      {action}
    </CardHeader>
  );
}

type CardProps = { data: CenterPrices; canEdit: boolean; onEdit: (e: Editing) => void };

function CoursesCard({ data, canEdit, onEdit }: CardProps) {
  const { t, format } = useI18n();
  const money = (n: number) => format.money(n, data.currency);
  return (
    <Card className="gap-0 pb-0">
      <SectionHeader icon={BookOpenIcon} title={t("billing.prices.courses.title")} hint={t("billing.prices.courses.hint")} />
      <div className="mt-4 overflow-x-auto border-t">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("billing.prices.columns.course")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("billing.prices.columns.students")}</TableHead>
              <TableHead>{t("billing.prices.columns.price")}</TableHead>
              {canEdit && <TableHead className="w-14 text-center">{t("common.labels.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  {t("billing.prices.courses.empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.courses.map((c) => (
                <TableRow key={c.id} className={c.isActive ? undefined : "opacity-60"}>
                  <TableCell>
                    <p className="font-semibold">
                      <bdi>{c.title}</bdi>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <bdi>{c.teacher.name}</bdi>
                    </p>
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{format.number(c.students)}</TableCell>
                  <TableCell>
                    {c.price !== null ? (
                      <span className="font-semibold tabular-nums">
                        <bdi>{t("billing.perSession", { amount: money(c.price) })}</bdi>
                      </span>
                    ) : data.defaultPrice !== null ? (
                      <span className="text-sm text-muted-foreground">
                        <bdi>{t("billing.perSession", { amount: money(data.defaultPrice) })}</bdi>
                        <span className="block text-xs">{t("billing.prices.courses.usesDefault")}</span>
                      </span>
                    ) : (
                      <Badge variant="warning">{t("billing.noRate")}</Badge>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-center">
                      <RowActions
                        label={c.title}
                        actions={[
                          { label: t("billing.prices.actions.setPrice"), icon: PencilIcon, onClick: () => onEdit({ kind: "course", course: c }) },
                          { label: t("billing.prices.actions.addSpecial"), icon: UserRoundIcon, onClick: () => onEdit({ kind: "special", courseId: c.id }) },
                        ]}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function TeachersCard({ data, canEdit, onEdit }: CardProps) {
  const { t } = useI18n();
  const payText = usePay(data.currency);
  return (
    <Card className="gap-0 pb-0">
      <SectionHeader icon={HandCoinsIcon} title={t("billing.prices.teachers.title")} hint={t("billing.prices.teachers.hint")} />
      <div className="mt-4 overflow-x-auto border-t">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("billing.prices.columns.teacher")}</TableHead>
              <TableHead>{t("billing.prices.columns.pay")}</TableHead>
              {canEdit && <TableHead className="w-14 text-center">{t("common.labels.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.teachers.map((x) => (
              <TableRow key={x.id}>
                <TableCell className="font-semibold">
                  <bdi>{x.name}</bdi>
                </TableCell>
                <TableCell>
                  {x.pay ? (
                    <span className="font-semibold tabular-nums">
                      <bdi>{payText(x.pay)}</bdi>
                    </span>
                  ) : (
                    <Badge variant="warning">{t("billing.prices.teachers.none")}</Badge>
                  )}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-center">
                    <RowActions label={x.name} actions={[{ label: t("billing.prices.actions.setPay"), icon: PencilIcon, onClick: () => onEdit({ kind: "teacher", teacher: x }) }]} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function SpecialCard({ data, canEdit, onEdit }: CardProps) {
  const { t, format } = useI18n();
  const set = useSetPrice();
  const remove = (r: CenterPrices["special"][number]) =>
    set.mutate(
      { path: "/billing/prices/special", body: { courseId: r.course.id, studentId: r.student.id, amount: null } },
      { onSuccess: () => toast.success(t("billing.prices.dialog.removed")), onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))) },
    );
  return (
    <Card className="gap-0 pb-0">
      <SectionHeader
        icon={UserRoundIcon}
        title={t("billing.prices.special.title")}
        hint={t("billing.prices.special.hint")}
        action={
          canEdit && data.courses.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => onEdit({ kind: "special" })}>
              <PlusIcon data-icon="inline-start" /> {t("billing.prices.special.add")}
            </Button>
          ) : undefined
        }
      />
      <div className="mt-4 overflow-x-auto border-t">
        <Table>
          <TableBody>
            {data.special.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                  {t("billing.prices.special.empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.special.map((r) => {
                const actions: RowAction[] = [
                  { label: t("billing.prices.actions.edit"), icon: PencilIcon, onClick: () => onEdit({ kind: "special", row: r }) },
                  { label: t("billing.prices.actions.remove"), icon: Trash2Icon, variant: "destructive", separatorBefore: true, onClick: () => remove(r) },
                ];
                return (
                  <TableRow key={`${r.course.id}:${r.student.id}`}>
                    <TableCell>
                      <p className="font-semibold">
                        <bdi>{r.student.name}</bdi>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <bdi>{r.course.title}</bdi>
                      </p>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      <bdi>{t("billing.perSession", { amount: format.money(r.price, data.currency) })}</bdi>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="w-14 text-center">
                        <RowActions label={r.student.name} actions={actions} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function RulesCard({ data, canEdit, onEdit }: CardProps) {
  const { t, format } = useI18n();
  const update = useUpdate<{ chargeAbsent: boolean }>("/tenants", { successMessage: t("billing.prices.dialog.saved") });
  const [chargeAbsent, setChargeAbsent] = useState(data.chargeAbsent);
  const percent = data.platformFeePercent;

  function toggleAbsent(v: boolean) {
    setChargeAbsent(v);
    update.mutate(
      { id: "me", body: { chargeAbsent: v } },
      // The hook reports the outcome; a refusal puts the switch back.
      { onError: () => setChargeAbsent(!v) },
    );
  }

  return (
    <Card>
      <SectionHeader icon={SettingsIcon} title={t("billing.prices.rules.title")} hint={t("billing.prices.rules.hint")} />
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="flex items-start justify-between gap-3 rounded-xl border p-4">
          <div className="space-y-1">
            <p className="font-medium">{t("billing.prices.rules.default.label")}</p>
            <p className="text-sm text-muted-foreground">{t("billing.prices.rules.default.hint")}</p>
            <p className="pt-1 font-semibold tabular-nums">
              {data.defaultPrice !== null ? (
                <bdi>{t("billing.perSession", { amount: format.money(data.defaultPrice, data.currency) })}</bdi>
              ) : (
                <span className="text-muted-foreground">{t("billing.notSet")}</span>
              )}
            </p>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit({ kind: "default" })}>
              <PencilIcon data-icon="inline-start" /> {t("billing.prices.actions.edit")}
            </Button>
          )}
        </div>
        <Field orientation="horizontal" className="items-start rounded-xl border p-4">
          <Switch id="charge-absent" checked={chargeAbsent} disabled={!canEdit || update.isPending} onCheckedChange={toggleAbsent} />
          <div className="space-y-1">
            <FieldLabel htmlFor="charge-absent">{t("billing.prices.rules.absent.label")}</FieldLabel>
            <FieldDescription>{t(chargeAbsent ? "billing.prices.rules.absent.on" : "billing.prices.rules.absent.off")}</FieldDescription>
          </div>
        </Field>
        {percent !== undefined && (
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3 text-sm md:col-span-2">
            <BadgePercentIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {percent === null ? t("billing.prices.rules.platformNone") : t("billing.prices.rules.platform", { percent: format.number(percent) })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** One dialog for every price: an amount (and, for a teacher, a fixed amount or a percentage). */
function EditDialog({ editing, data, onClose }: { editing: Editing | null; data: CenterPrices; onClose: () => void }) {
  const { t } = useI18n();
  const title = !editing
    ? ""
    : editing.kind === "default"
      ? t("billing.prices.rules.default.label")
      : editing.kind === "course"
        ? t("billing.prices.dialog.coursePrice")
        : editing.kind === "teacher"
          ? t("billing.prices.dialog.teacherPay")
          : t("billing.prices.special.title");
  const subject = editing?.kind === "course" ? editing.course.title : editing?.kind === "teacher" ? editing.teacher.name : null;
  const formKey = !editing
    ? "none"
    : editing.kind === "course"
      ? `c:${editing.course.id}`
      : editing.kind === "teacher"
        ? `t:${editing.teacher.id}`
        : editing.kind === "special"
          ? `s:${editing.row?.course.id ?? editing.courseId ?? ""}:${editing.row?.student.id ?? ""}`
          : "default";
  return (
    <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subject ? <bdi className="font-medium text-foreground">{subject}</bdi> : t("billing.prices.dialog.note")}</DialogDescription>
        </DialogHeader>
        {editing && <EditForm key={formKey} editing={editing} data={data} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ editing, data, onDone }: { editing: Editing; data: CenterPrices; onDone: () => void }) {
  const { t, format } = useI18n();
  const set = useSetPrice();
  const initial =
    editing.kind === "default"
      ? data.defaultPrice
      : editing.kind === "course"
        ? editing.course.price
        : editing.kind === "teacher"
          ? (editing.teacher.pay?.amount ?? null)
          : (editing.row?.price ?? null);
  const [amount, setAmount] = useState(initial === null ? "" : String(initial));
  const [basis, setBasis] = useState<RateBasis>(editing.kind === "teacher" ? (editing.teacher.pay?.basis ?? "PER_SESSION") : "PER_SESSION");
  const [courseId, setCourseId] = useState(editing.kind === "special" ? (editing.row?.course.id ?? editing.courseId ?? "") : "");
  const [studentId, setStudentId] = useState(editing.kind === "special" ? (editing.row?.student.id ?? "") : "");
  const isNewSpecial = editing.kind === "special" && !editing.row;
  const enrolled = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => (await api.get<CourseDetail>(`/courses/${courseId}`)).data,
    enabled: isNewSpecial && Boolean(courseId),
  });

  const trimmed = amount.trim();
  const value = Number(trimmed);
  const valid = AMOUNT.test(trimmed) && (basis !== "PERCENT" || value <= 100);
  const ready = valid && (editing.kind !== "special" || (courseId && studentId));

  function send(remove: boolean) {
    const body = { amount: remove ? null : value };
    const req =
      editing.kind === "default"
        ? { path: "/billing/prices/default", body }
        : editing.kind === "course"
          ? { path: `/billing/prices/courses/${editing.course.id}`, body }
          : editing.kind === "teacher"
            ? { path: `/billing/pay/${editing.teacher.id}`, body: { ...body, basis } }
            : { path: "/billing/prices/special", body: { ...body, courseId, studentId } };
    set.mutate(req, {
      onSuccess: () => {
        toast.success(t(remove ? "billing.prices.dialog.removed" : "billing.prices.dialog.saved"));
        onDone();
      },
      onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))),
    });
  }

  const course = data.courses.find((c) => c.id === courseId);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) send(false);
      }}
    >
      {editing.kind === "special" && (
        <>
          <Field>
            <FieldLabel htmlFor="special-course">{t("billing.prices.columns.course")}</FieldLabel>
            <Select
              value={courseId || undefined}
              disabled={!isNewSpecial}
              onValueChange={(v) => {
                setCourseId(v);
                setStudentId("");
              }}
            >
              <SelectTrigger id="special-course" className="w-full">
                <SelectValue placeholder={t("common.select.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {data.courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <bdi>{c.title}</bdi>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="special-student">{t("billing.prices.columns.student")}</FieldLabel>
            {isNewSpecial ? (
              <Select value={studentId || undefined} disabled={!courseId || enrolled.isPending} onValueChange={setStudentId}>
                <SelectTrigger id="special-student" className="w-full">
                  <SelectValue placeholder={courseId && enrolled.isPending ? t("common.labels.loading") : t("common.select.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(enrolled.data?.enrollments ?? []).map((e) => (
                    <SelectItem key={e.studentId} value={e.studentId}>
                      <bdi>{e.student.user.fullName}</bdi>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id="special-student" value={editing.kind === "special" ? (editing.row?.student.name ?? "") : ""} disabled />
            )}
            {isNewSpecial && courseId && enrolled.data?.enrollments.length === 0 && (
              <FieldDescription>{t("billing.prices.dialog.noStudents")}</FieldDescription>
            )}
          </Field>
        </>
      )}

      {editing.kind === "teacher" && (
        <Field>
          <FieldLabel id="pay-basis">{t("billing.prices.dialog.basis")}</FieldLabel>
          <ToggleGroup type="single" variant="outline" spacing={0} aria-labelledby="pay-basis" value={basis} onValueChange={(v) => v && setBasis(v as RateBasis)} className="w-full">
            <ToggleGroupItem value="PER_SESSION" className="flex-1">
              {t("billing.prices.dialog.fixed")}
            </ToggleGroupItem>
            <ToggleGroupItem value="PERCENT" className="flex-1">
              {t("billing.prices.dialog.share")}
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor="price-amount">{t(basis === "PERCENT" ? "billing.prices.dialog.percent" : "billing.prices.dialog.amount")}</FieldLabel>
        <div className="relative">
          <Input
            id="price-amount"
            type="number"
            inputMode="decimal"
            min={0}
            max={basis === "PERCENT" ? 100 : undefined}
            step={0.01}
            dir="ltr"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pe-14"
            aria-invalid={trimmed !== "" && !valid}
          />
          <span className="pointer-events-none absolute inset-e-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" dir="ltr">
            {basis === "PERCENT" ? "%" : data.currency}
          </span>
        </div>
        <FieldDescription>
          {editing.kind === "special" && course?.price != null
            ? t("billing.prices.dialog.coursePriceIs", { amount: format.money(course.price, data.currency) })
            : t("billing.prices.dialog.note")}
        </FieldDescription>
      </Field>

      <DialogFooter className="sm:justify-between">
        {initial !== null ? (
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={set.isPending} onClick={() => send(true)}>
            <Trash2Icon data-icon="inline-start" /> {t("billing.prices.actions.remove")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" disabled={set.isPending || !ready}>
            {set.isPending && <Loader2Icon className="animate-spin" />}
            {t("common.actions.save")}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
