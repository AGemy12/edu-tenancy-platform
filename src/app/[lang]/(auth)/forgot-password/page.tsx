"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, MailCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TextField } from "@/components/form-fields";
import { useForgotPassword } from "@/hooks/use-auth";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas";

export default function ForgotPasswordPage() {
  const { t, rich } = useI18n();
  const forgot = useForgotPassword();
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  if (forgot.isSuccess) {
    return (
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader>
          <span className="mb-2 flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <MailCheckIcon className="size-7" aria-hidden="true" />
          </span>
          <CardTitle className="text-2xl">{t("auth.forgot.sentTitle")}</CardTitle>
          <CardDescription>{t("auth.forgot.sentDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {forgot.data.devResetUrl && (
            <Alert>
              <AlertTitle>{t("auth.forgot.devModeTitle")}</AlertTitle>
              <AlertDescription>
                <p>
                  {rich("auth.forgot.devModeText", {
                    link: (
                      <Link href={forgot.data.devResetUrl} className="break-all font-semibold text-primary underline" dir="ltr">
                        {forgot.data.devResetUrl}
                      </Link>
                    ),
                  })}
                </p>
              </AlertDescription>
            </Alert>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">{t("auth.forgot.backToLogin")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl">{t("auth.forgot.title")}</CardTitle>
        <CardDescription>{t("auth.forgot.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((values) => forgot.mutate(forgotPasswordSchema.parse(values)))} noValidate>
          <FieldGroup>
            <TextField control={form.control} name="email" label={t("fields.email")} type="email" dir="ltr" autoComplete="email" />
            <Button type="submit" size="lg" className="w-full" disabled={forgot.isPending}>
              {forgot.isPending && <Loader2Icon className="animate-spin" />}
              {t("auth.forgot.submit")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.forgot.remembered")}{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                {t("auth.forgot.signIn")}
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
