"use client";

import { useId, useState } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { CheckIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n/provider";
import { translateMessage, vmsg } from "@/i18n/validation";
import { PASSWORD_RULES } from "@/lib/password-policy";

/** Zod messages are encoded keys (see i18n/validation); translate them for display. */
function useFieldError() {
  const t = useT();
  return (error: { message?: string } | undefined) => error && { ...error, message: translateMessage(t, error.message) };
}

type Base<T extends FieldValues, TCtx, TOut> = {
  control: Control<T, TCtx, TOut>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
  className?: string;
};

export function TextField<T extends FieldValues, TCtx, TOut>({
  control,
  name,
  label,
  hint,
  className,
  ...input
}: Base<T, TCtx, TOut> & Omit<React.ComponentProps<typeof Input>, "name">) {
  const translateError = useFieldError();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field className={className} data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input id={name} aria-invalid={fieldState.invalid} {...input} {...field} value={field.value ?? ""} />
          {hint && !fieldState.error && <FieldDescription>{hint}</FieldDescription>}
          <FieldError errors={[translateError(fieldState.error)]} />
        </Field>
      )}
    />
  );
}

const WEAK_PASSWORD = vmsg("validation.passwordWeak");

/**
 * Password input with a show/hide toggle. With `requirements` it is a new password: a strength
 * bar and a checklist of `PASSWORD_RULES` follow what's typed. `optional` hides them until
 * something is typed (accounts whose owner may pick the password later).
 */
export function PasswordField<T extends FieldValues, TCtx, TOut>({
  control,
  name,
  label,
  hint,
  className,
  requirements = false,
  optional = false,
  ...input
}: Base<T, TCtx, TOut> &
  Omit<React.ComponentProps<typeof Input>, "name" | "type" | "dir"> & { requirements?: boolean; optional?: boolean }) {
  const t = useT();
  const translateError = useFieldError();
  const [visible, setVisible] = useState(false);
  const rulesId = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = String(field.value ?? "");
        const showRules = requirements && (!optional || value !== "");
        // The checklist already says what's missing, so its generic error isn't repeated under it.
        const error = showRules && fieldState.error?.message === WEAK_PASSWORD ? undefined : fieldState.error;
        return (
          <Field className={className} data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            <div className="relative" dir="ltr">
              <Input
                id={name}
                type={visible ? "text" : "password"}
                className="pe-11"
                aria-invalid={fieldState.invalid}
                aria-describedby={showRules ? rulesId : undefined}
                {...input}
                {...field}
                value={value}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute end-1 top-1/2 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label={t(visible ? "common.password.hide" : "common.password.show")}
                aria-pressed={visible}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
            </div>
            {hint && !fieldState.error && <FieldDescription>{hint}</FieldDescription>}
            {showRules && <PasswordRequirements id={rulesId} value={value} flagMissing={fieldState.invalid} />}
            <FieldError errors={[translateError(error)]} />
          </Field>
        );
      }}
    />
  );
}

const STRENGTH = [
  { level: "weak", bar: "bg-destructive", text: "text-destructive" },
  { level: "fair", bar: "bg-warning", text: "text-warning-foreground dark:text-warning" },
  { level: "good", bar: "bg-info", text: "text-info" },
  { level: "strong", bar: "bg-success", text: "text-success" },
] as const;

function PasswordRequirements({ id, value, flagMissing }: { id: string; value: string; flagMissing: boolean }) {
  const t = useT();
  const passed = PASSWORD_RULES.filter((r) => r.test(value)).length;
  // 0-2 rules weak, 3 fair, 4 good, all 5 strong.
  const strength = value ? STRENGTH[Math.max(0, passed - 2)] : undefined;
  return (
    <div id={id} className="@container space-y-3 rounded-xl border bg-muted/40 p-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-muted-foreground">{t("common.password.strength")}</span>
          <span aria-live="polite" className={cn("font-semibold", strength?.text)}>
            {strength && t(`common.password.levels.${strength.level}`)}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {PASSWORD_RULES.map((r, i) => (
            <span
              key={r.key}
              className={cn("h-1.5 flex-1 rounded-full bg-border transition-colors duration-300", strength && i < passed && strength.bar)}
            />
          ))}
        </div>
      </div>
      <ul aria-label={t("common.password.requirements")} className="grid gap-x-4 gap-y-1.5 text-xs @sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(value);
          const missing = !met && flagMissing;
          return (
            <li
              key={rule.key}
              className={cn(
                "flex items-center gap-2 transition-colors",
                met ? "text-success" : missing ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full transition-colors",
                  met ? "bg-success text-success-foreground" : "border border-current",
                )}
                aria-hidden="true"
              >
                {met ? <CheckIcon className="size-3" strokeWidth={3} /> : missing && <XIcon className="size-2.5" strokeWidth={3} />}
              </span>
              <span>{t(`common.password.rules.${rule.key}`)}</span>
              <span className="sr-only">({t(met ? "common.password.met" : "common.password.unmet")})</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TextareaField<T extends FieldValues, TCtx, TOut>({
  control,
  name,
  label,
  hint,
  className,
  ...input
}: Base<T, TCtx, TOut> & Omit<React.ComponentProps<typeof Textarea>, "name">) {
  const translateError = useFieldError();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field className={className} data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Textarea id={name} aria-invalid={fieldState.invalid} {...input} {...field} value={field.value ?? ""} />
          {hint && !fieldState.error && <FieldDescription>{hint}</FieldDescription>}
          <FieldError errors={[translateError(fieldState.error)]} />
        </Field>
      )}
    />
  );
}

export function SelectField<T extends FieldValues, TCtx, TOut>({
  control,
  name,
  label,
  hint,
  className,
  options,
  placeholder,
  loading,
}: Base<T, TCtx, TOut> & {
  options: { value: string; label: string }[];
  placeholder?: string;
  loading?: boolean;
}) {
  const t = useT();
  const translateError = useFieldError();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field className={className} data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Select value={field.value || undefined} onValueChange={field.onChange} name={field.name}>
            <SelectTrigger id={name} className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}>
              <SelectValue placeholder={loading ? t("common.labels.loading") : (placeholder ?? t("common.select.placeholder"))} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hint && !fieldState.error && <FieldDescription>{hint}</FieldDescription>}
          <FieldError errors={[translateError(fieldState.error)]} />
        </Field>
      )}
    />
  );
}
