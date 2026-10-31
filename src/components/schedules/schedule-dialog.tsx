"use client";

import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangleIcon, CalendarClockIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectField, TextField } from "@/components/form-fields";
import { MeetingAccountNotice } from "@/components/sessions/meeting-account-notice";
import { useCurrentUser } from "@/hooks/use-auth";
import { useList } from "@/hooks/use-resources";
import { useI18n } from "@/i18n/provider";
import { translateMessage, vmsg, label } from "@/i18n/validation";
import { api, getErrorMessage } from "@/lib/api";
import { weekdayOrder } from "@/lib/calendar";
import { schedulePlanSchema, scheduleSchema } from "@/lib/schemas";
import type { Course, SchedulePreview, SessionProvider, Student, StudentSchedule, Teacher } from "@/lib/types";

const PROVIDERS: SessionProvider[] = ["ZOOM", "GOOGLE_MEET", "MANUAL"];

type SlotValues = { weekday: string; startTime: string };
type FormValues = {
  title: string;
  teacherId: string;
  studentId: string;
  courseId: string;
  provider: string;
  meetingUrl: string;
  monthlyHours: string;
  weeklyHours: string;
  startDate: string;
  slots: SlotValues[];
};

const pad = (n: number) => String(n).padStart(2, "0");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const blank = (studentId = ""): FormValues => ({
  title: "",
  teacherId: "",
  studentId,
  courseId: "",
  provider: "",
  meetingUrl: "",
  monthlyHours: "",
  weeklyHours: "",
  startDate: today(),
  slots: [{ weekday: "", startTime: "" }],
});

/** Weekdays in the order a local calendar shows them (see weekStartFor). */
export function useWeekdays() {
  const { locale, format } = useI18n();
  return weekdayOrder(locale).map((d) => ({ value: String(d), label: format.weekday(d) }));
}

/** 90 → "1 hour 30 minutes", in the page's language. */
export function useDuration() {
  const { t } = useI18n();
  return (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h && m) {
      return t("schedules.duration.hoursMinutes", {
        hours: t("schedules.duration.hours", { count: h }),
        minutes: t("schedules.duration.minutes", { count: m }),
      });
    }
    return h || !m ? t("schedules.duration.hours", { count: h }) : t("schedules.duration.minutes", { count: m });
  };
}

/** Waits until `value` stops changing for `ms` before passing it on. */
function useSettled<T>(value: T, ms: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

export default function ScheduleDialog({
  open,
  onOpenChange,
  studentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselects the student (e.g. coming from the students page). */
  studentId?: string;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("schedules.create")}</DialogTitle>
          <DialogDescription>{t("schedules.form.description")}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts from a blank form. */}
        {open && <ScheduleForm studentId={studentId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ScheduleForm({ studentId, onDone }: { studentId?: string; onDone: () => void }) {
  const { t, format } = useI18n();
  const qc = useQueryClient();
  const duration = useDuration();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "SUPER_ADMIN";

  const form = useForm<FormValues>({ defaultValues: blank(studentId) });
  const slots = useFieldArray({ control: form.control, name: "slots" });
  const values = useWatch({ control: form.control }) as FormValues;

  const students = useList<Student>("/students");
  const teachers = useList<Teacher>("/teachers", isAdmin);
  const courses = useList<Course>("/courses");
  const courseOptions = (courses.data ?? [])
    .filter((c) => !isAdmin || !values.teacherId || c.teacher.id === values.teacherId)
    .map((c) => ({ value: c.id, label: c.title }));

  // Preview the month whenever the plan is complete; the server lays it out in the center's timezone.
  const plan = schedulePlanSchema.safeParse(values);
  const planBody = plan.success && (!isAdmin || plan.data.teacherId) ? JSON.stringify(plan.data) : null;
  const settledBody = useSettled(planBody, 400);
  const preview = useQuery({
    queryKey: ["schedules", "preview", settledBody],
    queryFn: async () => (await api.post<SchedulePreview>("/schedules/preview", JSON.parse(settledBody!))).data,
    enabled: Boolean(settledBody),
    retry: false,
    staleTime: 30_000,
  });
  const current = planBody && planBody === settledBody ? preview : null;

  const weekly = Number(values.weeklyHours);
  const sessionMinutes = weekly > 0 && values.slots.length > 0 ? (weekly * 60) / values.slots.length : null;

  const create = useMutation({
    mutationFn: async (body: unknown) => (await api.post<StudentSchedule>("/schedules", body)).data,
    onSuccess: (row) => {
      toast.success(t("schedules.toast.created", { count: row.stats.sessions }));
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      onDone();
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.saveFailed"))),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    form.clearErrors();
    const result = scheduleSchema.safeParse(form.getValues());
    const missingTeacher = isAdmin && !form.getValues("teacherId");
    if (missingTeacher) {
      form.setError("teacherId", { type: "validate", message: vmsg("validation.required", { label: label("fields.teacher") }) });
    }
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join(".") || "title";
        form.setError(path as keyof FormValues, { type: "validate", message: issue.message });
      }
    }
    if (!result.success || missingTeacher) {
      toast.error(t("common.toast.checkFields"));
      return;
    }
    create.mutate(result.data);
  }

  const occurrences = current?.data?.occurrences ?? [];
  const conflicts = occurrences.filter((o) => o.conflict).length;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          control={form.control}
          name="studentId"
          label={t("fields.student")}
          loading={students.isPending}
          options={(students.data ?? []).map((s) => ({ value: s.id, label: s.user.fullName }))}
        />
        {isAdmin && (
          <SelectField
            control={form.control}
            name="teacherId"
            label={t("fields.teacher")}
            loading={teachers.isPending}
            options={(teachers.data ?? []).map((x) => ({ value: x.id, label: x.user.fullName }))}
          />
        )}
        <TextField control={form.control} name="title" label={t("fields.sessionTitle")} placeholder={t("schedules.form.titlePlaceholder")} />
        <SelectField
          control={form.control}
          name="courseId"
          label={t("fields.course")}
          loading={courses.isPending}
          options={courseOptions}
        />
        <SelectField
          control={form.control}
          name="provider"
          label={t("fields.platform")}
          hint={t("sessions.form.providerHint")}
          options={PROVIDERS.map((p) => ({ value: p, label: t(`sessions.provider.${p}`) }))}
        />
        {values.provider === "MANUAL" && (
          <TextField
            control={form.control}
            name="meetingUrl"
            label={t("sessions.form.meetingUrl")}
            dir="ltr"
            placeholder="https://…"
          />
        )}
        <MeetingAccountNotice provider={values.provider} teacherId={values.teacherId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          control={form.control}
          name="monthlyHours"
          label={t("fields.monthlyHours")}
          hint={t("schedules.form.monthlyHint")}
          type="number"
          inputMode="decimal"
          min={0.25}
          step={0.5}
          dir="ltr"
        />
        <TextField
          control={form.control}
          name="weeklyHours"
          label={t("fields.weeklyHours")}
          hint={t("schedules.form.weeklyHint")}
          type="number"
          inputMode="decimal"
          min={0.25}
          step={0.5}
          dir="ltr"
        />
        <TextField
          control={form.control}
          name="startDate"
          label={t("fields.startDate")}
          hint={t("schedules.form.startDateHint")}
          type="date"
          dir="ltr"
        />
      </div>

      <FieldSet className="gap-3">
        <FieldLegend>{t("schedules.form.slots")}</FieldLegend>
        <FieldDescription>{t("schedules.form.slotsHint")}</FieldDescription>
        <ul className="space-y-2">
          {slots.fields.map((slot, i) => (
            <SlotRow
              key={slot.id}
              control={form.control}
              index={i}
              canRemove={slots.fields.length > 1}
              onRemove={() => slots.remove(i)}
            />
          ))}
        </ul>
        <FormError message={form.formState.errors.slots?.root?.message ?? form.formState.errors.slots?.message} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={slots.fields.length >= 14}
            onClick={() => slots.append({ weekday: "", startTime: values.slots.at(-1)?.startTime ?? "" })}
          >
            <PlusIcon data-icon="inline-start" /> {t("schedules.form.addSlot")}
          </Button>
          {sessionMinutes !== null && Number.isFinite(sessionMinutes) && (
            <p className="text-sm text-muted-foreground">
              {t("schedules.form.sessionLength", { duration: duration(sessionMinutes) })}
            </p>
          )}
        </div>
      </FieldSet>

      <section className="space-y-3 rounded-2xl border bg-muted/30 p-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <CalendarClockIcon className="size-4.5 text-primary" aria-hidden="true" />
            {t("schedules.preview.title")}
          </h3>
          {current?.data && (
            <Badge variant="info">
              {t("schedules.preview.summary", {
                sessions: t("schedules.sessions", { count: occurrences.length }),
                hours: duration(current.data.totalMinutes),
              })}
            </Badge>
          )}
        </div>

        {!planBody ? (
          <p className="text-sm text-muted-foreground">{t("schedules.preview.hint")}</p>
        ) : !current || current.isFetching ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" /> {t("schedules.preview.loading")}
          </p>
        ) : current.isError ? (
          <Alert variant="destructive">
            <AlertTriangleIcon aria-hidden="true" />
            <AlertDescription>{getErrorMessage(current.error, t("common.toast.loadFailed"))}</AlertDescription>
          </Alert>
        ) : current.data ? (
          <>
            {current.data.totalMinutes < current.data.monthlyMinutes && (
              <Alert>
                <AlertTriangleIcon aria-hidden="true" className="text-warning" />
                <AlertDescription>
                  {t("schedules.preview.shortfall", {
                    scheduled: duration(current.data.totalMinutes),
                    monthly: duration(current.data.monthlyMinutes),
                  })}
                </AlertDescription>
              </Alert>
            )}
            {conflicts > 0 && (
              <Alert variant="destructive">
                <AlertTriangleIcon aria-hidden="true" />
                <AlertDescription>
                  <p className="font-medium">{t("schedules.preview.conflicts", { count: conflicts })}</p>
                  <p>{t("schedules.preview.conflictsBlock")}</p>
                </AlertDescription>
              </Alert>
            )}
            <ol className="max-h-64 divide-y overflow-y-auto rounded-xl border bg-card">
              {occurrences.map((o, i) => {
                const minutes = (new Date(o.endAt).getTime() - new Date(o.startAt).getTime()) / 60_000;
                return (
                  <li key={o.startAt} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                    <span className="w-6 text-muted-foreground tabular-nums">{format.number(i + 1)}</span>
                    <span className="font-medium tabular-nums">{format.dateTime(o.startAt)}</span>
                    <span className="text-muted-foreground">{duration(minutes)}</span>
                    {minutes < current.data!.sessionMinutes && (
                      <Badge variant="outline">{t("schedules.preview.shorter")}</Badge>
                    )}
                    {o.conflict && <Badge variant="destructive">{t("schedules.preview.conflict")}</Badge>}
                  </li>
                );
              })}
            </ol>
          </>
        ) : null}
      </section>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.actions.cancel")}
        </Button>
        {/* The API refuses clashing sessions: nobody can be in two sessions at once. */}
        <Button type="submit" disabled={create.isPending || conflicts > 0}>
          {create.isPending && <Loader2Icon className="animate-spin" />}
          {current?.data ? t("schedules.form.save", { count: occurrences.length }) : t("common.actions.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SlotRow({
  control,
  index,
  canRemove,
  onRemove,
}: {
  control: Control<FormValues>;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const weekdays = useWeekdays();
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_8.5rem_auto] items-start gap-2">
      <Controller
        control={control}
        name={`slots.${index}.weekday`}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <Select value={field.value || undefined} onValueChange={field.onChange} name={field.name}>
              <SelectTrigger className="w-full" aria-label={t("fields.weekday")} aria-invalid={fieldState.invalid} onBlur={field.onBlur}>
                <SelectValue placeholder={t("fields.weekday")} />
              </SelectTrigger>
              <SelectContent>
                {weekdays.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormError message={fieldState.error?.message} />
          </Field>
        )}
      />
      <Controller
        control={control}
        name={`slots.${index}.startTime`}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <Input type="time" dir="ltr" aria-label={t("fields.time")} aria-invalid={fieldState.invalid} {...field} />
            <FormError message={fieldState.error?.message} />
          </Field>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canRemove}
        onClick={onRemove}
        aria-label={t("schedules.form.removeSlot")}
      >
        <Trash2Icon />
      </Button>
    </li>
  );
}

/** A zod message (an encoded key) shown under a control. */
function FormError({ message }: { message?: string }) {
  const { t } = useI18n();
  if (!message) return null;
  return <FieldError errors={[{ message: translateMessage(t, message) }]} />;
}
