"use client";

import { CheckIcon, PackageIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlans } from "@/hooks/use-storage-admin";
import { intlLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { getErrorMessage } from "@/lib/api";
import { formatBytes } from "@/lib/library";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "./file-views";

const MB = 1024 * 1024;

/** The package catalog. Upgrading is shown but disabled until payments exist. */
export function PlansDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const plans = usePlans(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("library.plans.title")}</DialogTitle>
          <DialogDescription>{t("library.plans.description")}</DialogDescription>
        </DialogHeader>

        {plans.isPending ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : plans.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(plans.error, t("library.plans.loadFailed"))}</AlertDescription>
          </Alert>
        ) : !plans.data.length ? (
          <EmptyState icon={PackageIcon} title={t("library.plans.empty")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.data.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const { t, rich, locale } = useI18n();
  const size = (mb: number) => <span dir="ltr">{formatBytes(mb * MB)}</span>;
  const features = [
    rich("library.plans.perTeacher", { size: size(plan.storagePerTeacherMb) }),
    rich("library.plans.sharedSpace", { size: size(plan.sharedStorageMb) }),
    rich("library.plans.maxFile", { size: size(plan.maxFileMb) }),
    t("library.plans.teachers", { count: plan.maxTeachers }),
    t("library.plans.students", { count: plan.maxStudents }),
  ];

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-5",
        plan.isCurrent && "border-primary ring-2 ring-primary/30",
      )}
    >
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold">
            <bdi>{plan.name}</bdi>
          </h3>
          {plan.isCurrent && <Badge>{t("library.plans.current")}</Badge>}
        </div>
        {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
      </div>
      <p className="text-2xl font-bold">{price(plan, locale, t)}</p>
      <ul className="flex-1 space-y-2 text-sm">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {!plan.isCurrent && (
        <div className="space-y-1.5">
          <Button className="w-full" disabled>
            {t("library.plans.upgrade")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t("library.plans.soon")}</p>
        </div>
      )}
    </div>
  );
}

function price(plan: Plan, locale: ReturnType<typeof useI18n>["locale"], t: ReturnType<typeof useI18n>["t"]) {
  if (plan.priceMonthly === null) return t("library.plans.customPrice");
  const amount = Number(plan.priceMonthly);
  if (!Number.isFinite(amount)) return t("library.plans.customPrice");
  if (amount === 0) return t("library.plans.free");
  let text: string;
  try {
    text = new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: plan.currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Unknown currency code: plain number plus the code.
    text = `${new Intl.NumberFormat(intlLocale(locale)).format(amount)} ${plan.currency}`;
  }
  return t("library.plans.perMonth", { price: text });
}
