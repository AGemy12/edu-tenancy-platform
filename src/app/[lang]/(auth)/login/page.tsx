"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { PasswordField, TextField } from "@/components/form-fields";
import { useLogin } from "@/hooks/use-auth";
import { Link } from "@/i18n/navigation";
import { useT } from "@/i18n/provider";
import { loginSchema, type LoginInput } from "@/lib/schemas";

export default function LoginPage() {
  const t = useT();
  const login = useLogin();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  return (
    <Card className="w-full max-w-md shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl">{t("auth.login.title")}</CardTitle>
        <CardDescription>{t("auth.login.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((values) => login.mutate(loginSchema.parse(values)))} noValidate>
          <FieldGroup>
            <TextField control={form.control} name="email" label={t("fields.email")} type="email" dir="ltr" autoComplete="email" />
            <PasswordField control={form.control} name="password" label={t("fields.password")} autoComplete="current-password" />

            <div className="flex items-center justify-between gap-3">
              <Controller
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <Label htmlFor="rememberMe" className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                    <Checkbox id="rememberMe" checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(v === true)} />
                    {t("auth.login.rememberMe")}
                  </Label>
                )}
              />
              <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
                {t("auth.login.forgotPassword")}
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
              {login.isPending && <Loader2Icon className="animate-spin" />}
              {t("auth.login.submit")}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.login.noAccount")}{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                {t("auth.login.createCenter")}
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
