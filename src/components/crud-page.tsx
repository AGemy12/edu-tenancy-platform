"use client";

import { useState } from "react";
import { useForm, type Control, type FieldValues } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { EyeIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PasswordField, SelectField, TextField, TextareaField } from "@/components/form-fields";
import { RowActions, type RowAction } from "@/components/row-actions";
import { useCreate, useList, useRemove, useUpdate } from "@/hooks/use-resources";
import { getErrorMessage } from "@/lib/api";
import { useT } from "@/i18n/provider";

type Row = Record<string, unknown> & { id: string };

export type Column<T extends Row> = {
  key: string;
  label: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
  /** Hide from the details dialog (e.g. action buttons). */
  hideInView?: boolean;
};

export type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "date" | "datetime-local" | "textarea" | "select";
  placeholder?: string;
  dir?: "ltr" | "rtl";
  hint?: string;
  options?: { value: string; label: string }[];
  /** Load select options from a list endpoint. */
  optionsFrom?: { endpoint: string; labelKey: string | ((row: Row) => string) };
  /** Shown only when creating (e.g. password). */
  createOnly?: boolean;
  /** Shown only when editing (e.g. status). */
  editOnly?: boolean;
};

/** Form values are plain strings keyed by field name; the schema turns them into the API body. */
type FormIn = FieldValues;
type FormSchema = z.ZodType<unknown, FormIn>;
type FormControl = Control<FormIn, unknown, unknown>;

export type RowHelpers = {
  /** PATCH a row with a partial body (e.g. { status: "PUBLISHED" }). */
  update: (id: string, body: Record<string, unknown>) => void;
  /** Open the edit dialog for a row. */
  edit: (row: Row) => void;
  /** Open the details dialog for a row. */
  view: (row: Row) => void;
};

type Props<T extends Row> = {
  title: string;
  description?: string;
  endpoint: string;
  columns: Column<T>[];
  fields: Field[];
  /** Zod schema for creating: input = form strings, output = API body. */
  schema: FormSchema;
  /** Zod schema for editing. Editing is enabled when both this and `toForm` are given. */
  updateSchema?: FormSchema;
  /** Row → form strings used to prefill the edit dialog. */
  toForm?: (row: T) => Record<string, string>;
  /** Extra per-row actions appended to the menu (join, publish, …). */
  rowActions?: (row: T, helpers: RowHelpers) => RowAction[];
  /** Text shown at the top of the row menu and in dialogs. */
  rowLabel?: (row: T) => string;
  createLabel?: string;
  /** More buttons beside "create", in the header and the empty state. */
  extraActions?: React.ReactNode;
  /** Replaces the delete confirmation text for a row. */
  deleteText?: (row: T) => string | undefined;
  canCreate?: boolean;
  /** Also per row, for rows that must be kept (e.g. sessions that already happened). */
  canDelete?: boolean | ((row: T) => boolean);
  canView?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  /** Shown instead of the table (e.g. a calendar). Gets the rows and each row's menu; the dialogs still work. */
  renderView?: (view: { rows: T[]; loading: boolean; actionsFor: (row: T) => RowAction[] }) => React.ReactNode;
};

function get(row: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[k];
    return undefined;
  }, row);
}

function RemoteSelect({ field, control }: { field: Field; control: FormControl }) {
  const remote = useList<Row>(field.optionsFrom?.endpoint ?? "", Boolean(field.optionsFrom));
  const options =
    field.options ??
    (remote.data ?? []).map((r) => ({
      value: r.id,
      label:
        typeof field.optionsFrom!.labelKey === "function"
          ? field.optionsFrom!.labelKey(r)
          : String(get(r, field.optionsFrom!.labelKey as string) ?? r.id),
    }));
  return (
    <SelectField
      control={control}
      name={field.name}
      label={field.label}
      hint={field.hint}
      options={options}
      loading={Boolean(field.optionsFrom) && remote.isPending}
    />
  );
}

type DialogState<T> = { mode: "create" } | { mode: "edit"; row: T } | null;

export default function CrudPage<T extends Row>({
  title,
  description,
  endpoint,
  columns,
  fields,
  schema,
  updateSchema,
  toForm,
  rowActions,
  rowLabel,
  createLabel: createLabelProp,
  extraActions,
  deleteText,
  canCreate = true,
  canDelete = true,
  canView = true,
  emptyTitle: emptyTitleProp,
  emptyText,
  renderView,
}: Props<T>) {
  const t = useT();
  const createLabel = createLabelProp ?? t("common.actions.add");
  const emptyTitle = emptyTitleProp ?? t("common.crud.emptyTitle");
  const list = useList<T>(endpoint);
  const create = useCreate<unknown>(endpoint);
  const update = useUpdate<unknown>(endpoint);
  const remove = useRemove(endpoint);
  const [dialog, setDialog] = useState<DialogState<T>>(null);
  const [viewRow, setViewRow] = useState<T | null>(null);
  const [confirm, setConfirm] = useState<T | null>(null);
  const canEdit = Boolean(updateSchema && toForm);

  const blankValues: FormIn = Object.fromEntries(fields.map((f) => [f.name, ""]));

  // One form serves both create and edit; the active zod schema is picked at submit time.
  const form = useForm<FormIn>({ defaultValues: blankValues });

  function openCreate() {
    form.reset(blankValues);
    setDialog({ mode: "create" });
  }
  function openEdit(row: T) {
    if (!toForm) return;
    form.reset({ ...blankValues, ...toForm(row) });
    setDialog({ mode: "edit", row });
  }
  function closeDialog() {
    setDialog(null);
    form.reset(blankValues);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const editing = dialog?.mode === "edit";
    const active = editing && updateSchema ? updateSchema : schema;
    form.clearErrors();
    const result = active.safeParse(form.getValues());
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join(".") || fields[0]?.name;
        if (path) form.setError(path, { type: "validate", message: issue.message });
      }
      toast.error(t("common.toast.checkFields"));
      return;
    }
    const req = editing
      ? update.mutateAsync({ id: dialog.row.id, body: result.data })
      : create.mutateAsync(result.data);
    await req.then(closeDialog).catch(() => undefined);
  }

  const helpers: RowHelpers = {
    update: (id, body) => update.mutate({ id, body }),
    edit: (row) => openEdit(row as T),
    view: (row) => setViewRow(row as T),
  };

  function actionsFor(row: T): RowAction[] {
    const base: RowAction[] = [];
    if (canView) base.push({ label: t("common.actions.viewDetails"), icon: EyeIcon, onClick: () => setViewRow(row) });
    if (canEdit) base.push({ label: t("common.actions.edit"), icon: PencilIcon, onClick: () => openEdit(row) });
    const extra = rowActions?.(row, helpers) ?? [];
    const del: RowAction[] = (typeof canDelete === "function" ? canDelete(row) : canDelete)
      ? [{ label: t("common.actions.delete"), icon: Trash2Icon, variant: "destructive", separatorBefore: true, onClick: () => setConfirm(row) }]
      : [];
    return [...base, ...extra, ...del];
  }

  const hasActions = canView || canEdit || canDelete || Boolean(rowActions);
  const visibleFields = fields.filter((f) =>
    dialog?.mode === "edit" ? !f.createOnly : !f.editOnly,
  );
  const saving = create.isPending || update.isPending;
  const rows = list.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {(canCreate || extraActions) && (
          <div className="flex flex-wrap gap-2">
            {extraActions}
            {canCreate && (
              <Button onClick={openCreate}>
                <PlusIcon data-icon="inline-start" /> {createLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {list.isError && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(list.error, t("common.toast.loadFailed"))}</AlertDescription>
        </Alert>
      )}

      {renderView ? (
        renderView({ rows, loading: list.isPending, actionsFor })
      ) : (
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead key={c.key} className={c.className}>
                    {c.label}
                  </TableHead>
                ))}
                {hasActions && <TableHead className="w-14 text-center">{t("common.labels.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isPending ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((c) => (
                      <TableCell key={c.key}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                    {hasActions && <TableCell />}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <PlusIcon className="size-6" aria-hidden="true" />
                      </span>
                      <p className="font-semibold">{emptyTitle}</p>
                      {emptyText && <p className="text-sm text-muted-foreground">{emptyText}</p>}
                      {(canCreate || extraActions) && (
                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                          {extraActions}
                          {canCreate && (
                            <Button size="sm" onClick={openCreate}>
                              {createLabel}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={c.className}>
                        {c.render ? c.render(row) : <bdi>{String(get(row, c.key) ?? "—")}</bdi>}
                      </TableCell>
                    ))}
                    {hasActions && (
                      <TableCell className="text-center">
                        <RowActions actions={actionsFor(row)} label={rowLabel?.(row)} />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <DialogHeader>
              <DialogTitle>{dialog?.mode === "edit" ? t("common.actions.edit") : createLabel}</DialogTitle>
              <DialogDescription>
                {dialog?.mode === "edit" && rowLabel ? rowLabel(dialog.row) : t("common.crud.fillAndSave")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleFields.map((f) => {
                if (f.type === "select") {
                  return <RemoteSelect key={f.name} field={f} control={form.control} />;
                }
                if (f.type === "textarea") {
                  return (
                    <TextareaField
                      key={f.name}
                      control={form.control}
                      name={f.name}
                      label={f.label}
                      hint={f.hint}
                      placeholder={f.placeholder}
                      className="sm:col-span-2"
                      rows={3}
                    />
                  );
                }
                if (f.type === "password") {
                  // A password set for someone else: optional, since they can pick one from the welcome email.
                  return (
                    <PasswordField
                      key={f.name}
                      control={form.control}
                      name={f.name}
                      label={f.label}
                      hint={f.hint}
                      autoComplete="new-password"
                      className="sm:col-span-2"
                      requirements
                      optional
                    />
                  );
                }
                return (
                  <TextField
                    key={f.name}
                    control={form.control}
                    name={f.name}
                    label={f.label}
                    hint={f.hint}
                    type={f.type ?? "text"}
                    dir={f.dir}
                    placeholder={f.placeholder}
                  />
                );
              })}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2Icon className="animate-spin" />}
                {dialog?.mode === "edit" ? t("common.actions.saveChanges") : t("common.actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details dialog */}
      <Dialog open={viewRow !== null} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewRow && rowLabel ? rowLabel(viewRow) : t("common.labels.details")}</DialogTitle>
            <DialogDescription>{t("common.crud.allData")}</DialogDescription>
          </DialogHeader>
          {viewRow && (
            <dl className="divide-y rounded-xl border">
              {columns
                .filter((c) => !c.hideInView && c.label)
                .map((c) => (
                  <div key={c.key} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
                    <dt className="text-muted-foreground">{c.label}</dt>
                    <dd className="col-span-2 font-medium">
                      {c.render ? c.render(viewRow) : <bdi>{String(get(viewRow, c.key) ?? "—")}</bdi>}
                    </dd>
                  </div>
                ))}
            </dl>
          )}
          <DialogFooter>
            {canEdit && viewRow && (
              <Button
                variant="secondary"
                onClick={() => {
                  const row = viewRow;
                  setViewRow(null);
                  openEdit(row);
                }}
              >
                <PencilIcon data-icon="inline-start" /> {t("common.actions.edit")}
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewRow(null)}>
              {t("common.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <span className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <Trash2Icon className="size-6" aria-hidden="true" />
            </span>
            <DialogTitle>{t("common.crud.confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>
              {(confirm && deleteText?.(confirm)) ??
                (confirm && rowLabel
                  ? t("common.crud.confirmDeleteText", { name: rowLabel(confirm) })
                  : t("common.crud.confirmDeleteGeneric"))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {t("common.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => confirm && remove.mutate(confirm.id, { onSettled: () => setConfirm(null) })}
            >
              {remove.isPending && <Loader2Icon className="animate-spin" />}
              {t("common.crud.confirmDeleteYes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
