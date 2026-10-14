"use client";

import { useMemo, useState } from "react";
import { CheckIcon, FolderClosedIcon, HouseIcon, Loader2Icon, SearchIcon, SendIcon, UsersRoundIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n/provider";
import { CATEGORY_ORDER, FOLDER_COLORS, buildTree, folderTint, initials, type FolderNode } from "@/lib/library";
import type { FileCategory, FolderColor, LibraryFile, LibraryFolder, StudentFolder } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ───────── Create / rename folder ───────── */

export function FolderDialog({
  open,
  onOpenChange,
  initial,
  parentName,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: LibraryFolder | null;
  parentName?: string;
  pending: boolean;
  onSubmit: (values: { name: string; color: FolderColor }) => void;
}) {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<FolderColor>(initial?.color ?? "teal");
  const nameLocked = Boolean(initial?.isStudentRoot);
  const valid = nameLocked || name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSubmit({ name: name.trim(), color });
          }}
          className="grid gap-5"
        >
          <DialogHeader>
            <DialogTitle>{initial ? t("library.dialogs.folder.editTitle") : t("library.dialogs.folder.createTitle")}</DialogTitle>
            <DialogDescription>
              {initial
                ? t("library.dialogs.folder.editDescription")
                : parentName
                  ? t("library.dialogs.folder.createInside", { name: parentName })
                  : t("library.dialogs.folder.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="folder-name">{t("library.dialogs.folder.name")}</Label>
            <Input
              id="folder-name"
              autoFocus
              value={name}
              disabled={nameLocked}
              maxLength={80}
              placeholder={t("library.dialogs.folder.namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
            {nameLocked && <p className="text-xs text-muted-foreground">{t("library.dialogs.folder.nameLocked")}</p>}
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t("library.dialogs.folder.color")}</legend>
            <div className="flex flex-wrap gap-2.5" role="radiogroup">
              {(Object.keys(FOLDER_COLORS) as FolderColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={t(`library.colors.${c}`)}
                  onClick={() => setColor(c)}
                  className={cn(
                    "grid size-9 place-items-center rounded-full text-white ring-offset-2 ring-offset-background transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    FOLDER_COLORS[c].swatch,
                    color === c && "ring-2 ring-foreground",
                  )}
                >
                  {color === c && <CheckIcon className="size-4" />}
                </button>
              ))}
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={!valid || pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              {initial ? t("common.actions.save") : t("common.actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Edit file details ───────── */

export function FileEditDialog({
  file,
  onOpenChange,
  pending,
  onSubmit,
}: {
  file: LibraryFile | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (values: { name: string; category: FileCategory; description: string }) => void;
}) {
  const t = useT();
  const [name, setName] = useState(file?.name ?? "");
  const [category, setCategory] = useState<FileCategory>(file?.category ?? "OTHER");
  const [description, setDescription] = useState(file?.description ?? "");

  return (
    <Dialog open={Boolean(file)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onSubmit({ name: name.trim(), category, description: description.trim() });
          }}
          className="grid gap-5"
        >
          <DialogHeader>
            <DialogTitle>{t("library.dialogs.edit.title")}</DialogTitle>
            <DialogDescription>{t("library.dialogs.edit.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="file-name">{t("library.dialogs.edit.name")}</Label>
            <Input id="file-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="file-category">{t("library.dialogs.edit.category")}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as FileCategory)}>
              <SelectTrigger id="file-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_ORDER.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`library.categories.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="file-desc">{t("library.dialogs.edit.notes")}</Label>
            <Textarea
              id="file-desc"
              rows={3}
              maxLength={1000}
              value={description}
              placeholder={t("library.dialogs.edit.notesPlaceholder")}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim() || pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              {t("common.actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Move to folder ───────── */

export function MoveDialog({
  open,
  onOpenChange,
  title,
  folders,
  disabledIds,
  currentId,
  pending,
  onConfirm,
  description,
  root,
  confirmLabel,
  allowCurrent = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  folders: LibraryFolder[];
  /** Folders that can't be a target (the moved folder and its children). */
  disabledIds?: Set<string>;
  currentId: string | null;
  pending: boolean;
  onConfirm: (folderId: string | null) => void;
  /** Overrides for other pickers built on this one (center library, "add to my library"). */
  description?: string;
  root?: { label: string; icon: LucideIcon };
  confirmLabel?: string;
  /** Lets the preselected folder be confirmed as is (a picker rather than a move). */
  allowCurrent?: boolean;
}) {
  const t = useT();
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const tree = useMemo(() => buildTree(folders), [folders]);
  const mine = tree.filter((n) => !n.studentId);
  const students = tree.filter((n) => n.studentId);
  const chosen = target === undefined ? currentId : target;
  const rowProps = { chosen, disabledIds, onPick: setTarget };
  const RootIcon = root?.icon ?? HouseIcon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? t("library.dialogs.move.description")}</DialogDescription>
        </DialogHeader>
        <div className="-mx-2 max-h-[55vh] space-y-0.5 overflow-y-auto px-2">
          <button
            type="button"
            onClick={() => setTarget(null)}
            aria-pressed={chosen === null}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-sm hover:bg-muted",
              chosen === null && "bg-secondary font-semibold text-secondary-foreground hover:bg-secondary",
            )}
          >
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <RootIcon className="size-4" />
            </span>
            {root?.label ?? t("library.dialogs.move.root")}
            {chosen === null && <CheckIcon className="ms-auto size-4" />}
          </button>
          {mine.map((n) => (
            <MoveTargetRow key={n.id} node={n} depth={1} {...rowProps} />
          ))}
          {students.length > 0 && (
            <>
              <p className="px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground">{t("library.dialogs.move.studentFolders")}</p>
              {students.map((n) => (
                <MoveTargetRow key={n.id} node={n} depth={0} {...rowProps} />
              ))}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button disabled={pending || (!allowCurrent && chosen === currentId)} onClick={() => onConfirm(chosen ?? null)}>
            {pending && <Loader2Icon className="animate-spin" />}
            {confirmLabel ?? t("library.dialogs.move.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveTargetRow({
  node,
  depth,
  chosen,
  disabledIds,
  onPick,
}: {
  node: FolderNode;
  depth: number;
  chosen: string | null;
  disabledIds?: Set<string>;
  onPick: (id: string) => void;
}) {
  return (
    <>
      <button
        type="button"
        disabled={disabledIds?.has(node.id)}
        onClick={() => onPick(node.id)}
        aria-pressed={chosen === node.id}
        style={{ paddingInlineStart: `${0.75 + depth * 1.25}rem` }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl py-2 pe-3 text-start text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
          chosen === node.id && "bg-secondary font-semibold text-secondary-foreground hover:bg-secondary",
        )}
      >
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", folderTint(node.color))}>
          <FolderClosedIcon className="size-4" />
        </span>
        <span className="truncate"><bdi>{node.name}</bdi></span>
        {chosen === node.id && <CheckIcon className="ms-auto size-4" />}
      </button>
      {node.children.map((c) => (
        <MoveTargetRow key={c.id} node={c} depth={depth + 1} chosen={chosen} disabledIds={disabledIds} onPick={onPick} />
      ))}
    </>
  );
}

/* ───────── Send to students ───────── */

export function SendDialog({
  open,
  onOpenChange,
  count,
  students,
  loading,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  students: StudentFolder[] | undefined;
  loading: boolean;
  pending: boolean;
  onConfirm: (studentIds: string[]) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const list = (students ?? []).filter((s) => !query.trim() || s.fullName.includes(query.trim()) || s.grade?.includes(query.trim()));
  const allPicked = list.length > 0 && list.every((s) => picked.has(s.studentId));

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("library.dialogs.send.title", { count })}</DialogTitle>
          <DialogDescription>{t("library.dialogs.send.description")}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("library.dialogs.send.searchPlaceholder")} className="ps-9" />
        </div>

        <div className="-mx-2 max-h-[45vh] overflow-y-auto px-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !students?.length ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <UsersRoundIcon className="size-8" />
              {t("library.dialogs.send.noStudents")}
            </div>
          ) : (
            <>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-muted">
                <Checkbox
                  checked={allPicked}
                  onCheckedChange={(v) =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      list.forEach((s) => (v === true ? next.add(s.studentId) : next.delete(s.studentId)));
                      return next;
                    })
                  }
                />
                {t("library.dialogs.send.selectAll", { count: list.length })}
              </label>
              {list.map((s) => (
                <label key={s.studentId} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted has-[button[data-state=checked]]:bg-secondary/60">
                  <Checkbox checked={picked.has(s.studentId)} onCheckedChange={() => toggle(s.studentId)} />
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">{initials(s.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold"><bdi>{s.fullName}</bdi></span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[s.grade, t("library.count.files", { count: s.files })].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </label>
              ))}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button disabled={picked.size === 0 || pending} onClick={() => onConfirm([...picked])}>
            {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            {picked.size ? t("library.dialogs.send.sendTo", { count: picked.size }) : t("library.dialogs.send.pickStudents")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Confirm destructive action ───────── */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending && <Loader2Icon className="animate-spin" />}
            {confirmLabel ?? t("common.actions.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
