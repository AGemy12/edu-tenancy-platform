"use client";

import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { useT } from "@/i18n/provider";

/** One block of a settings-style page: what it is beside (or, on small screens, above) its card. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-10">
      <header className="space-y-1 lg:pt-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** A form card's footer: the submit button, with a note while there are unsaved edits. */
export function SaveFooter({
  label,
  dirty = false,
  disabled = false,
  pending = false,
}: {
  label?: string;
  dirty?: boolean;
  disabled?: boolean;
  pending?: boolean;
}) {
  const t = useT();
  return (
    <CardFooter className="flex-wrap justify-end gap-x-4 gap-y-2">
      {dirty && (
        <span className="me-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
          {t("common.labels.unsavedChanges")}
        </span>
      )}
      <Button type="submit" disabled={disabled || pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        {label ?? t("common.actions.saveChanges")}
      </Button>
    </CardFooter>
  );
}

/** The page title block shared by settings-style pages. */
export function SettingsHeader({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}
