"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveIcon, ArchiveRestoreIcon, EyeIcon, EyeOffIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import PlanDialog from "@/components/platform/plan-dialog";
import { RowActions, type RowAction } from "@/components/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useList } from "@/hooks/use-resources";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { formatBytes } from "@/lib/library";
import type { AdminPlan } from "@/lib/types";

const MB = 1024 * 1024;

/**
 * Super admin: the package catalog. Hidden packages (not public) are granted by the platform only,
 * which is how a free package is kept for chosen centers without being offered to everyone.
 */
export default function PlatformPlansPage() {
  const { t, format, locale } = useI18n();
  const qc = useQueryClient();
  const plans = useList<AdminPlan>("/plans/all");
  const [editor, setEditor] = useState<{ open: boolean; plan: AdminPlan | null }>({ open: false, plan: null });
  const [deleting, setDeleting] = useState<AdminPlan | null>(null);

  const done = (message: string) => () => {
    toast.success(message);
    qc.invalidateQueries({ queryKey: ["list"] });
    qc.invalidateQueries({ queryKey: ["platform"] });
  };
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Pick<AdminPlan, "isPublic" | "isActive">> }) => api.patch(`/plans/${id}`, body),
    onSuccess: done(t("platform.plans.toast.saved")),
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.updateFailed"))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => {
      done(t("platform.plans.toast.deleted"))();
      setDeleting(null);
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.actionFailed"))),
  });

  const actionsFor = (p: AdminPlan): RowAction[] => [
    { label: t("common.actions.edit"), icon: PencilIcon, onClick: () => setEditor({ open: true, plan: p }) },
    p.isPublic
      ? { label: t("platform.plans.actions.hide"), icon: EyeOffIcon, onClick: () => patch.mutate({ id: p.id, body: { isPublic: false } }) }
      : { label: t("platform.plans.actions.show"), icon: EyeIcon, onClick: () => patch.mutate({ id: p.id, body: { isPublic: true } }) },
    p.isActive
      ? { label: t("platform.plans.actions.retire"), icon: ArchiveIcon, onClick: () => patch.mutate({ id: p.id, body: { isActive: false } }) }
      : { label: t("platform.plans.actions.activate"), icon: ArchiveRestoreIcon, onClick: () => patch.mutate({ id: p.id, body: { isActive: true } }) },
    // A package centers are on can only be retired; the API refuses the delete too.
    { label: t("common.actions.delete"), icon: Trash2Icon, variant: "destructive", separatorBefore: true, disabled: p.tenants > 0, onClick: () => setDeleting(p) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t("platform.plans.title")}</h1>
          <p className="text-muted-foreground">{t("platform.plans.pageDescription")}</p>
        </div>
        <Button onClick={() => setEditor({ open: true, plan: null })}>
          <PlusIcon data-icon="inline-start" /> {t("platform.plans.actions.add")}
        </Button>
      </div>

      <Card className="gap-0 py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("platform.plans.columns.plan")}</TableHead>
                <TableHead>{t("platform.plans.columns.price")}</TableHead>
                <TableHead>{t("platform.plans.columns.fee")}</TableHead>
                <TableHead>{t("platform.plans.columns.teachers")}</TableHead>
                <TableHead>{t("platform.plans.columns.students")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("platform.plans.columns.storage")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("platform.plans.columns.shared")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("platform.plans.columns.maxFile")}</TableHead>
                <TableHead>{t("platform.plans.columns.tenants")}</TableHead>
                <TableHead>{t("platform.plans.columns.visibility")}</TableHead>
                <TableHead className="w-14 text-center">{t("common.labels.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.isPending ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                (plans.data ?? []).map((p) => (
                  <TableRow key={p.id} className={!p.isActive ? "opacity-60" : undefined}>
                    <TableCell>
                      <p className="font-semibold">
                        <bdi>{locale === "ar" ? p.nameAr : p.nameEn}</bdi>
                      </p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {p.code}
                      </p>
                    </TableCell>
                    <TableCell className="tabular-nums">{p.priceMonthly && Number(p.priceMonthly) > 0 ? `${format.number(Number(p.priceMonthly))} ${p.currency}` : t("platform.detail.free")}</TableCell>
                    <TableCell className="tabular-nums">
                      {p.platformFeePercent ? (
                        <Badge variant="outline" dir="ltr">
                          {t("platform.feePercent", { percent: format.number(p.platformFeePercent) })}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("platform.noFee")}</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{format.number(p.maxTeachers)}</TableCell>
                    <TableCell className="tabular-nums">{format.number(p.maxStudents)}</TableCell>
                    <TableCell className="hidden tabular-nums md:table-cell" dir="ltr">
                      {formatBytes(p.storagePerTeacherMb * MB)}
                    </TableCell>
                    <TableCell className="hidden tabular-nums md:table-cell" dir="ltr">
                      {formatBytes(p.sharedStorageMb * MB)}
                    </TableCell>
                    <TableCell className="hidden tabular-nums lg:table-cell" dir="ltr">
                      {formatBytes(p.maxFileMb * MB)}
                    </TableCell>
                    <TableCell className="tabular-nums">{format.number(p.tenants)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!p.isActive && <Badge variant="destructive">{t("platform.plans.retired")}</Badge>}
                        {p.isActive && (p.isPublic ? <Badge variant="success">{t("platform.plans.public")}</Badge> : <Badge variant="outline">{t("platform.plans.hidden")}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <RowActions actions={actionsFor(p)} label={locale === "ar" ? p.nameAr : p.nameEn} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="text-sm text-muted-foreground">{t("platform.plans.hiddenNote")}</p>

      <PlanDialog open={editor.open} plan={editor.plan} onClose={() => setEditor({ open: false, plan: null })} />

      <Dialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("common.crud.confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>{deleting && t("platform.plans.deleteText", { name: locale === "ar" ? deleting.nameAr : deleting.nameEn })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("common.actions.cancel")}
            </Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>
              {t("common.crud.confirmDeleteYes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
