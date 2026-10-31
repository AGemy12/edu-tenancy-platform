import { z } from "zod";
import { label, vmsg } from "@/i18n/validation";
import type { MessageKey } from "@/i18n/messages";
import { isStrongPassword, PASSWORD_MAX } from "@/lib/password-policy";

type Label = Extract<MessageKey, `fields.${string}`>;

/* ───────── helpers ───────── */

/** Optional free text: empty string becomes undefined so the API gets no key. */
const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, vmsg("validation.maxChars", { max }))
    .optional()
    .transform((v) => (v ? v : undefined));

const requiredText = (field: Label, min = 2, max = 120) =>
  z
    .string()
    .trim()
    .min(min, vmsg("validation.requiredMin", { label: label(field), min }))
    .max(max, vmsg("validation.tooLong", { label: label(field) }));

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: vmsg("validation.email") }));

/** A new password; `PasswordField` shows which of the rules are still missing. */
const password = z
  .string()
  .max(PASSWORD_MAX, vmsg("validation.passwordMax"))
  .refine(isStrongPassword, vmsg("validation.passwordWeak"));

/** Accounts created for someone else: empty means they choose it from the welcome email. */
const optionalPassword = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || v.length <= PASSWORD_MAX, vmsg("validation.passwordMax"))
  .refine((v) => !v || isStrongPassword(v), vmsg("validation.passwordWeak"));

const phone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^[+0-9][0-9\s-]{4,19}$/.test(v), vmsg("validation.phone"));

/** Select value: empty string means "not chosen". */
const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || z.uuid().safeParse(v).success, vmsg("validation.invalidChoice"));

const requiredId = (field: Label) =>
  z
    .string()
    .min(1, vmsg("validation.required", { label: label(field) }))
    .pipe(z.uuid(vmsg("validation.invalid", { label: label(field) })));

const optionalNumber = (field: Label, min = 0) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= min), vmsg("validation.number", { label: label(field) }));

const requiredInt = (field: Label, min: number, max: number) =>
  z
    .string()
    .min(1, vmsg("validation.required", { label: label(field) }))
    .transform((v) => Number(v))
    .refine((v) => Number.isInteger(v) && v >= min && v <= max, vmsg("validation.intRange", { label: label(field), min, max }));

const isoDate = (field: Label) =>
  z
    .string()
    .min(1, vmsg("validation.required", { label: label(field) }))
    .refine((v) => !Number.isNaN(new Date(v).getTime()), vmsg("validation.invalid", { label: label(field) }))
    .transform((v) => new Date(v).toISOString());

/** Optional meeting link; empty means none. */
const meetingUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || z.url().safeParse(v).success, vmsg("validation.meetingUrl"));

/* ───────── auth ───────── */

export const loginSchema = z.object({
  email,
  password: z.string().min(1, vmsg("validation.passwordRequired")),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, vmsg("validation.confirmPassword")),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: vmsg("validation.passwordsMismatch"),
    path: ["confirmPassword"],
  });

/** "Al Noor Center" → "al-noor-center": the short English id a center is known by in links. */
export function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const registerSchema = z.object({
  tenantName: requiredText("fields.tenantName", 2, 80),
  tenantSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,40}$/, vmsg("validation.slug")),
  fullName: requiredText("fields.fullName", 3, 80),
  email,
  password,
});

/** The signed-in user's own details. The page asks for the current password only when the email changes. */
export const profileSchema = z.object({
  fullName: requiredText("fields.fullName", 3, 80),
  email,
  phone,
  currentPassword: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, vmsg("validation.currentPasswordRequired")),
    newPassword: password,
    confirmPassword: z.string().min(1, vmsg("validation.confirmPassword")),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: vmsg("validation.passwordsMismatch"),
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: vmsg("validation.samePassword"),
    path: ["newPassword"],
  });

/* ───────── resources ───────── */

export const teacherSchema = z.object({
  fullName: requiredText("fields.fullName", 3, 80),
  email,
  password: optionalPassword,
  phone,
  bio: optionalText(1000),
  subjects: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
});

export const studentSchema = z.object({
  fullName: requiredText("fields.fullName", 3, 80),
  email,
  password: optionalPassword,
  phone,
  grade: optionalText(60),
  parentPhone: phone,
  notes: optionalText(1000),
  teacherId: optionalId,
});

export const courseSchema = z.object({
  title: requiredText("fields.courseTitle", 3, 120),
  teacherId: requiredId("fields.teacher"),
  subject: optionalText(60),
  level: optionalText(60),
  price: optionalNumber("fields.price"),
  description: optionalText(2000),
});

export const sessionSchema = z
  .object({
    title: requiredText("fields.sessionTitle", 3, 120),
    teacherId: requiredId("fields.teacher"),
    courseId: optionalId,
    studentId: optionalId,
    provider: z.enum(["ZOOM", "GOOGLE_MEET", "MANUAL"], { message: vmsg("validation.chooseProvider") }),
    startAt: isoDate("fields.startAt"),
    endAt: isoDate("fields.endAt"),
    meetingUrl,
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: vmsg("validation.endAfterStart"),
    path: ["endAt"],
  })
  .refine((v) => v.provider !== "MANUAL" || Boolean(v.meetingUrl), {
    message: vmsg("validation.manualNeedsUrl"),
    path: ["meetingUrl"],
  })
  .refine((v) => Boolean(v.courseId) || Boolean(v.studentId), {
    message: vmsg("validation.courseOrStudent"),
    path: ["courseId"],
  })
  .transform(({ studentId, ...rest }) => ({
    ...rest,
    studentIds: studentId ? [studentId] : undefined,
  }));

export const examSchema = z.object({
  title: requiredText("fields.examTitle", 3, 120),
  courseId: requiredId("fields.course"),
  month: isoDate("fields.month"),
  totalMarks: requiredInt("fields.totalMarks", 1, 1000),
  description: optionalText(2000),
});

/** <input type="date"> value → the start of that day in local time, as ISO. */
const localDay = (field: Label) =>
  z
    .string()
    .min(1, vmsg("validation.required", { label: label(field) }))
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00`).getTime()), vmsg("validation.invalid", { label: label(field) }))
    .transform((v) => new Date(`${v}T00:00`).toISOString());

const rateAmount = z
  .string()
  .trim()
  .min(1, vmsg("validation.required", { label: label("fields.amount") }))
  .regex(/^\d{1,8}(\.\d{1,2})?$/, vmsg("validation.number", { label: label("fields.amount") }))
  .transform((v) => Number(v));

const rateBasis = z
  .string()
  .optional()
  .transform((v) => (v === "PERCENT" ? "PERCENT" : v === "PER_SESSION" ? "PER_SESSION" : "PER_HOUR"));

const percentWithinRange = (v: { basis: string; amount: number }) => v.basis !== "PERCENT" || v.amount <= 100;

/**
 * One rate-card line. The page fixes `kind`: a student price (teacher, course and student all
 * optional, the most specific wins) or teacher pay (teacher required, course optional).
 */
export const rateSchema = z
  .object({
    kind: z.enum(["STUDENT_FEE", "TEACHER_PAY"], { message: vmsg("validation.chooseRateKind") }),
    basis: rateBasis,
    teacherId: optionalId,
    courseId: optionalId,
    studentId: optionalId,
    amount: rateAmount,
    effectiveFrom: localDay("fields.effectiveFrom"),
    note: optionalText(500),
  })
  .refine((v) => v.kind !== "TEACHER_PAY" || Boolean(v.teacherId), {
    message: vmsg("validation.required", { label: label("fields.teacher") }),
    path: ["teacherId"],
  })
  .refine((v) => v.basis !== "PERCENT" || v.kind === "TEACHER_PAY", {
    message: vmsg("validation.percentOnlyTeacherPay"),
    path: ["basis"],
  })
  .refine(percentWithinRange, { message: vmsg("validation.percentMax"), path: ["amount"] })
  .refine((v) => v.kind !== "TEACHER_PAY" || !v.studentId, {
    message: vmsg("validation.teacherPayNoStudent"),
    path: ["studentId"],
  });

/* ───────── monthly schedules ───────── */

/** Hours with at most two decimals (e.g. 1.5), within [min, max]. */
const hours = (field: Label, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, vmsg("validation.required", { label: label(field) }))
    .regex(/^\d{1,3}(\.\d{1,2})?$/, vmsg("validation.range", { label: label(field), min, max }))
    .transform((v) => Number(v))
    .refine((v) => v >= min && v <= max, vmsg("validation.range", { label: label(field), min, max }));

/** Form values: weekday is a select ("0" = Sunday … "6"), startTime an <input type="time">. */
const scheduleSlot = z.object({
  weekday: z
    .string()
    .regex(/^[0-6]$/, vmsg("validation.chooseDay"))
    .transform((v) => Number(v)),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, vmsg("validation.time")),
});

const planShape = {
  teacherId: optionalId,
  monthlyHours: hours("fields.monthlyHours", 0.25, 200),
  weeklyHours: hours("fields.weeklyHours", 0.25, 60),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, vmsg("validation.required", { label: label("fields.startDate") })),
  slots: z.array(scheduleSlot).min(1, vmsg("validation.slotsRequired")),
};

const weeklyWithinMonthly = (v: { weeklyHours: number; monthlyHours: number }) => v.weeklyHours <= v.monthlyHours;
const weeklyAboveMonthly = { message: vmsg("validation.weeklyAboveMonthly"), path: ["weeklyHours"] };

/** What the month's layout depends on: parsed quietly while typing to fetch the preview. */
export const schedulePlanSchema = z.object({ ...planShape, studentId: optionalId }).refine(weeklyWithinMonthly, weeklyAboveMonthly);

export const scheduleSchema = z
  .object({
    ...planShape,
    studentId: requiredId("fields.student"),
    title: requiredText("fields.title", 3, 120),
    courseId: optionalId,
    provider: z.enum(["ZOOM", "GOOGLE_MEET", "MANUAL"], { message: vmsg("validation.chooseProvider") }),
    meetingUrl,
  })
  .refine(weeklyWithinMonthly, weeklyAboveMonthly)
  .refine((v) => v.provider !== "MANUAL" || Boolean(v.meetingUrl), {
    message: vmsg("validation.manualNeedsUrl"),
    path: ["meetingUrl"],
  });

/* ───────── platform: packages ───────── */

/** A package in the catalog (super admin). Form strings in, the API body out. */
export const planSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,19}$/, vmsg("validation.invalid", { label: label("fields.planCode") })),
  nameAr: requiredText("fields.planNameAr", 1, 60),
  nameEn: requiredText("fields.planNameEn", 1, 60),
  descriptionAr: optionalText(300),
  descriptionEn: optionalText(300),
  priceMonthly: optionalNumber("fields.priceMonthly"),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, vmsg("validation.invalid", { label: label("fields.currency") })),
  maxTeachers: requiredInt("fields.maxTeachers", 0, 100_000),
  maxStudents: requiredInt("fields.maxStudents", 0, 10_000_000),
  storagePerTeacherMb: requiredInt("fields.storagePerTeacherMb", 0, 10_000_000),
  sharedStorageMb: requiredInt("fields.sharedStorageMb", 0, 10_000_000),
  maxFileMb: requiredInt("fields.maxFileMb", 1, 100_000),
  sortOrder: requiredInt("fields.sortOrder", 0, 1000),
  isPublic: z.boolean(),
  isActive: z.boolean(),
});
export type PlanInput = z.input<typeof planSchema>;
export type PlanOutput = z.output<typeof planSchema>;

/* ───────── update schemas (only keys the API accepts on PATCH) ───────── */

const activeFlag = z
  .string()
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v === "true"));

export const teacherUpdateSchema = z.object({
  fullName: requiredText("fields.fullName", 3, 80),
  phone,
  bio: optionalText(1000),
  subjects: teacherSchema.shape.subjects,
});

export const studentUpdateSchema = z.object({
  fullName: requiredText("fields.fullName", 3, 80),
  phone,
  grade: optionalText(60),
  parentPhone: phone,
  notes: optionalText(1000),
});

export const courseUpdateSchema = z.object({
  title: requiredText("fields.courseTitle", 3, 120),
  subject: optionalText(60),
  level: optionalText(60),
  price: optionalNumber("fields.price"),
  description: optionalText(2000),
  isActive: activeFlag,
});

export const sessionUpdateSchema = z
  .object({
    title: requiredText("fields.sessionTitle", 3, 120),
    description: optionalText(2000),
    startAt: isoDate("fields.startAt"),
    endAt: isoDate("fields.endAt"),
    meetingUrl,
    notes: optionalText(2000),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: vmsg("validation.endAfterStart"),
    path: ["endAt"],
  });

export const examUpdateSchema = z.object({
  title: requiredText("fields.examTitle", 3, 120),
  month: isoDate("fields.month"),
  totalMarks: requiredInt("fields.totalMarks", 1, 1000),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"], { message: vmsg("validation.chooseStatus") }),
  description: optionalText(2000),
});

/** Who a rate applies to can't change; only its value, start date and note. */
export const rateUpdateSchema = z
  .object({
    basis: rateBasis,
    amount: rateAmount,
    effectiveFrom: localDay("fields.effectiveFrom"),
    note: optionalText(500),
  })
  .refine(percentWithinRange, { message: vmsg("validation.percentMax"), path: ["amount"] });

/* ───────── helpers for prefilling forms ───────── */

/** ISO → value for <input type="datetime-local"> in local time. */
export function toLocalDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO → value for <input type="date"> in local time (pairs with `localDay`). */
export function toLocalDateInput(iso: string | null | undefined) {
  return iso ? toLocalDateTime(iso).slice(0, 10) : "";
}

/** ISO → value for <input type="date"> (UTC date part). */
export function toDateInput(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : "";
}

export type LoginInput = z.input<typeof loginSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
/** Another center for someone who already has an account. */
export const createTenantSchema = registerSchema.pick({ tenantName: true, tenantSlug: true });

export type RegisterInput = z.input<typeof registerSchema>;
export type CreateTenantInput = z.input<typeof createTenantSchema>;
export type ProfileInput = z.input<typeof profileSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
