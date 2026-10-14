"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { PasswordField, TextField } from "@/components/form-fields";
import { useRegisterTenant } from "@/hooks/use-auth";
import { Link } from "@/i18n/navigation";
import { useT } from "@/i18n/provider";
import { registerSchema, slugify, type RegisterInput } from "@/lib/schemas";

export default function RegisterPage() {
  const t = useT();
  const register = useRegisterTenant();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { tenantName: "", tenantSlug: "", fullName: "", email: "", password: "" },
  });

  return (
    <Card className="w-full max-w-md shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl">{t("auth.register.title")}</CardTitle>
        <CardDescription>{t("auth.register.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((values) => register.mutate(registerSchema.parse(values)))} noValidate>
          <FieldGroup>
            <TextField control={form.control} name="tenantName" label={t("auth.register.tenantName")} />
            <TextField
              control={form.control}
              name="tenantSlug"
              label={t("auth.register.tenantSlug")}
              dir="ltr"
              placeholder="alnoor-center"
              hint={t("auth.register.tenantSlugHint")}
              onChange={(e) => form.setValue("tenantSlug", slugify(e.target.value), { shouldValidate: form.formState.isSubmitted })}
            />
            <TextField control={form.control} name="fullName" label={t("auth.register.fullName")} autoComplete="name" />
            <TextField control={form.control} name="email" label={t("fields.email")} type="email" dir="ltr" autoComplete="email" />
            <PasswordField control={form.control} name="password" label={t("fields.password")} autoComplete="new-password" requirements />

            <Button type="submit" size="lg" className="w-full" disabled={register.isPending}>
              {register.isPending && <Loader2Icon className="animate-spin" />}
              {t("auth.register.submit")}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.register.haveAccount")}{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                {t("auth.register.signIn")}
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
