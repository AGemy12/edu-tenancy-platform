"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2Icon, MailIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordField, TextField } from "@/components/form-fields";
import { SaveFooter, SettingsHeader, SettingsSection } from "@/components/settings-section";
import { useChangePassword, useCurrentUser, useUpdateProfile } from "@/hooks/use-auth";
import { useT } from "@/i18n/provider";
import { vmsg } from "@/i18n/validation";
import type { AuthUser } from "@/lib/types";
import { changePasswordSchema, profileSchema, type ChangePasswordInput, type ProfileInput } from "@/lib/schemas";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join(" ");
}

export default function ProfilePage() {
  const t = useT();
  const { user } = useCurrentUser();
  if (!user) return <Skeleton className="h-96 max-w-5xl rounded-2xl" />;

  return (
    <div className="max-w-5xl space-y-8">
      <SettingsHeader title={t("profile.title")} description={t("profile.description")} />

      <Card className="relative">
        {/* A soft brand band behind the avatar. */}
        <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-r from-primary/25 via-primary/10 to-transparent rtl:bg-linear-to-l" aria-hidden="true" />
        <CardContent className="relative flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <Avatar className="size-20 ring-4 ring-card">
            <AvatarFallback className="bg-accent text-2xl font-bold text-accent-foreground">{initials(user.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold">
                <bdi>{user.fullName}</bdi>
              </h2>
              <Badge variant="secondary">{t(`common.roles.${user.role}`)}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex min-w-0 items-center gap-1.5">
                <MailIcon className="size-4 shrink-0" aria-hidden="true" />
                <bdi className="truncate" dir="ltr">
                  {user.email}
                </bdi>
              </span>
              {user.tenant && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <Building2Icon className="size-4 shrink-0" aria-hidden="true" />
                  <bdi className="truncate">{user.tenant.name}</bdi>
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SettingsSection title={t("profile.details.title")} description={t("profile.details.description")}>
        <DetailsCard user={user} />
      </SettingsSection>
      <Separator />
      <SettingsSection title={t("profile.password.title")} description={t("profile.password.description")}>
        <PasswordCard />
      </SettingsSection>
    </div>
  );
}

function DetailsCard({ user }: { user: AuthUser }) {
  const t = useT();
  const update = useUpdateProfile();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    // `values` follows the user as /auth/me refreshes it, without dropping what's being typed.
    values: { fullName: user.fullName, email: user.email, phone: user.phone ?? "", currentPassword: "" },
    resetOptions: { keepDirtyValues: true },
  });
  const email = useWatch({ control: form.control, name: "email" });
  const emailChanged = (email ?? "").trim().toLowerCase() !== user.email;

  const onSubmit = form.handleSubmit((raw) => {
    const values = profileSchema.parse(raw);
    if (emailChanged && !values.currentPassword) {
      form.setError("currentPassword", { message: vmsg("validation.currentPasswordRequired") });
      return;
    }
    update.mutate(
      {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone ?? null,
        currentPassword: emailChanged ? values.currentPassword : undefined,
      },
      { onSuccess: (saved) => form.reset({ fullName: saved.fullName, email: saved.email, phone: saved.phone ?? "", currentPassword: "" }) },
    );
  });

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="contents">
        <CardContent className="grid gap-5 pt-2 sm:grid-cols-2">
          <TextField control={form.control} name="fullName" label={t("fields.fullName")} autoComplete="name" className="sm:col-span-2" />
          <TextField
            control={form.control}
            name="email"
            label={t("fields.email")}
            hint={t("profile.details.emailHint")}
            type="email"
            dir="ltr"
            autoComplete="email"
          />
          <TextField control={form.control} name="phone" label={t("fields.phone")} type="tel" dir="ltr" autoComplete="tel" />
          {emailChanged && (
            <PasswordField
              control={form.control}
              name="currentPassword"
              label={t("profile.details.currentPassword")}
              hint={t("profile.details.currentPasswordHint")}
              autoComplete="current-password"
              className="sm:col-span-2"
            />
          )}
        </CardContent>
        <SaveFooter label={t("profile.details.save")} dirty={form.formState.isDirty} disabled={!form.formState.isDirty} pending={update.isPending} />
      </form>
    </Card>
  );
}

function PasswordCard() {
  const t = useT();
  const change = useChangePassword();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) =>
    change.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => form.reset() },
    ),
  );

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="contents">
        <CardContent className="grid gap-5 pt-2">
          <PasswordField control={form.control} name="currentPassword" label={t("profile.password.current")} autoComplete="current-password" />
          <PasswordField control={form.control} name="newPassword" label={t("profile.password.new")} autoComplete="new-password" requirements />
          <PasswordField control={form.control} name="confirmPassword" label={t("profile.password.confirm")} autoComplete="new-password" />
        </CardContent>
        <SaveFooter label={t("profile.password.submit")} pending={change.isPending} />
      </form>
    </Card>
  );
}
