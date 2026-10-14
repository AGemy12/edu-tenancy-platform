"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordField } from "@/components/form-fields";
import { useResetPassword } from "@/hooks/use-auth";
import { Link } from "@/i18n/navigation";
import { useT } from "@/i18n/provider";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full max-w-md rounded-2xl" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const t = useT();
  const token = useSearchParams().get("token") ?? "";
  const reset = useResetPassword();
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">{t("auth.reset.invalidTitle")}</CardTitle>
          <CardDescription>{t("auth.reset.invalidDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/forgot-password">{t("auth.reset.requestNew")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl">{t("auth.reset.title")}</CardTitle>
        <CardDescription>{t("auth.reset.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((values) => reset.mutate({ token, password: values.password }))} noValidate>
          <FieldGroup>
            <PasswordField control={form.control} name="password" label={t("auth.reset.newPassword")} autoComplete="new-password" requirements />
            <PasswordField control={form.control} name="confirmPassword" label={t("auth.reset.confirmPassword")} autoComplete="new-password" />
            <Button type="submit" size="lg" className="w-full" disabled={reset.isPending}>
              {reset.isPending && <Loader2Icon className="animate-spin" />}
              {t("auth.reset.submit")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-semibold text-primary hover:underline">
                {t("auth.reset.backToLogin")}
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
