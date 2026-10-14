"use client";

import { useState } from "react";
import { EyeIcon, StarIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionsContextMenu, ActionsDropdown, FileThumb, FolderGlyph, type MenuAction } from "./file-visual";
import { useI18n, useT } from "@/i18n/provider";
import { displayName, formatBytes } from "@/lib/library";
import type { LibraryFile, LibraryFolder } from "@/lib/types";
import { cn } from "@/lib/utils";

export const DRAG_MIME = "application/x-library-files";

/** Click modifiers decide between opening and selecting (Ctrl/⌘ toggles, Shift selects a range). */
export type SelectGesture = { toggle: boolean; range: boolean };

type FileItemProps = {
  file: LibraryFile;
  selected: boolean;
  selectMode: boolean;
  /** Shows the checkbox (selection drives bulk actions). */
  selectable: boolean;
  /** Stars are personal: hidden on center-library files. */
  canStar: boolean;
  draggable: boolean;
  showFolder: boolean;
  actions: MenuAction[];
  onOpen: () => void;
  onSelect: (g: SelectGesture) => void;
  onToggleStar: () => void;
  dragIds: () => string[];
};

function handleActivate(e: React.MouseEvent, p: Pick<FileItemProps, "selectMode" | "onOpen" | "onSelect">) {
  const toggle = e.ctrlKey || e.metaKey;
  if (toggle || e.shiftKey || p.selectMode) p.onSelect({ toggle: toggle || p.selectMode, range: e.shiftKey });
  else p.onOpen();
}

function startDrag(e: React.DragEvent, ids: string[]) {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids));
  e.dataTransfer.effectAllowed = "move";
}

export function FileCard(p: FileItemProps) {
  const { t, format } = useI18n();
  const { file } = p;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable={p.draggable}
          onDragStart={(e) => startDrag(e, p.dragIds())}
          className={cn(
            "group/card relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200",
            "hover:-translate-y-0.5 hover:shadow-soft has-[button[data-open]:focus-visible]:ring-3 has-[button[data-open]:focus-visible]:ring-ring/50",
            p.selected && "border-primary ring-2 ring-primary/40",
          )}
        >
          <button
            type="button"
            data-open
            className="absolute inset-0 z-0 cursor-pointer outline-none"
            aria-label={t("library.card.open", { name: file.name })}
            onClick={(e) => handleActivate(e, p)}
          />
          <FileThumb file={file} className="pointer-events-none" />

          {p.selectable && (
            <div
              className={cn(
                "absolute top-2.5 start-2.5 z-10 rounded-md bg-background/90 p-1 shadow-sm backdrop-blur transition-opacity",
                p.selected || p.selectMode ? "opacity-100" : "opacity-0 group-hover/card:opacity-100 focus-within:opacity-100",
              )}
            >
              <Checkbox
                checked={p.selected}
                onCheckedChange={() => p.onSelect({ toggle: true, range: false })}
                aria-label={t("library.card.select", { name: file.name })}
                className="bg-background"
              />
            </div>
          )}
          {p.canStar && (
            <button
              type="button"
              onClick={p.onToggleStar}
              aria-label={file.starred ? t("library.menu.unstar") : t("library.menu.star")}
              aria-pressed={file.starred}
              className={cn(
                "absolute top-2.5 end-2.5 z-10 grid size-8 place-items-center rounded-full bg-background/90 shadow-sm backdrop-blur transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                file.starred ? "text-amber-500 opacity-100" : "text-muted-foreground opacity-0 group-hover/card:opacity-100",
              )}
            >
              <StarIcon className={cn("size-4", file.starred && "fill-current")} />
            </button>
          )}

          <div className="pointer-events-none relative flex flex-1 flex-col gap-1.5 p-3">
            <div className="flex items-start gap-1">
              <p className="line-clamp-2 min-h-10 flex-1 text-sm leading-5 font-semibold break-words" title={file.name}>
                <bdi>{displayName(file)}</bdi>
              </p>
              <div className="pointer-events-auto -me-1.5 -mt-1">
                <ActionsDropdown actions={p.actions} label={displayName(file)} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
              <span className="font-semibold uppercase" dir="ltr">
                {file.extension}
              </span>
              <span aria-hidden="true">·</span>
              <span dir="ltr">{formatBytes(file.size)}</span>
              <span aria-hidden="true">·</span>
              <span>{format.date(file.createdAt)}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {file.category !== "OTHER" && <Badge variant="secondary">{t(`library.categories.${file.category}`)}</Badge>}
              {p.showFolder && file.folder && (
                <Badge variant="outline" className="max-w-full truncate">
                  {p.selectable && file.folder.studentId ? <EyeIcon aria-label={t("library.card.visibleToStudent")} /> : null}
                  <bdi>{file.folder.name}</bdi>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ActionsContextMenu actions={p.actions} label={displayName(file)} />
    </ContextMenu>
  );
}

export function FileListView({
  items,
  allSelected,
  onSelectAll,
  selectable,
  showFolder,
}: {
  items: FileItemProps[];
  allSelected: boolean;
  onSelectAll: (on: boolean) => void;
  selectable: boolean;
  showFolder: boolean;
}) {
  const t = useT();
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={(v) => onSelectAll(v === true)} aria-label={t("library.list.selectAll")} />
                </TableHead>
              )}
              <TableHead className="min-w-64">{t("library.list.name")}</TableHead>
              <TableHead>{t("library.list.category")}</TableHead>
              {showFolder && <TableHead>{t("library.list.folder")}</TableHead>}
              <TableHead>{t("library.list.size")}</TableHead>
              <TableHead>{t("library.list.added")}</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{t("library.list.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <FileRow key={p.file.id} {...p} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FileRow(p: FileItemProps) {
  const { t, format } = useI18n();
  const { file } = p;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow
          data-state={p.selected ? "selected" : undefined}
          draggable={p.draggable}
          onDragStart={(e) => startDrag(e, p.dragIds())}
          className="group/row cursor-pointer"
          onClick={(e) => handleActivate(e, p)}
        >
          {p.selectable && (
            <TableCell onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={p.selected}
                onCheckedChange={() => p.onSelect({ toggle: true, range: false })}
                aria-label={t("library.card.select", { name: file.name })}
              />
            </TableCell>
          )}
          <TableCell>
            <div className="flex items-center gap-3">
              <FileThumb file={file} variant="row" />
              <div className="min-w-0">
                <button
                  type="button"
                  className="block max-w-80 truncate text-start font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
                  title={file.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivate(e, p);
                  }}
                >
                  <bdi>{displayName(file)}</bdi>
                </button>
                <span className="text-xs text-muted-foreground">{t(`library.kinds.${file.kind}.label`)}</span>
              </div>
              {file.starred && <StarIcon className="size-4 shrink-0 fill-amber-400 text-amber-500" aria-label={t("library.card.starred")} />}
            </div>
          </TableCell>
          <TableCell>{file.category !== "OTHER" ? <Badge variant="secondary">{t(`library.categories.${file.category}`)}</Badge> : "—"}</TableCell>
          {p.showFolder && (
            <TableCell className="max-w-48 truncate text-muted-foreground">
              <bdi>{file.folder?.name ?? (file.scope === "SHARED" ? t("library.sidebar.shared") : t("library.sidebar.home"))}</bdi>
            </TableCell>
          )}
          <TableCell className="text-muted-foreground" dir="ltr">
            <span className="block text-end">{formatBytes(file.size)}</span>
          </TableCell>
          <TableCell className="text-muted-foreground">{format.date(file.createdAt)}</TableCell>
          <TableCell onClick={(e) => e.stopPropagation()}>
            <ActionsDropdown actions={p.actions} label={displayName(file)} />
          </TableCell>
        </TableRow>
      </ContextMenuTrigger>
      <ActionsContextMenu actions={p.actions} label={displayName(file)} />
    </ContextMenu>
  );
}

export function FolderCard({
  folder,
  actions,
  onOpen,
  onDropFiles,
  canDrop,
}: {
  folder: LibraryFolder;
  actions: MenuAction[];
  onOpen: () => void;
  onDropFiles?: (ids: string[]) => void;
  canDrop: boolean;
}) {
  const t = useT();
  const [over, setOver] = useState(false);
  const count = [folder.folders ? t("library.count.folders", { count: folder.folders }) : null, t("library.count.files", { count: folder.files })]
    .filter(Boolean)
    .join(" · ");

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onDragOver={(e) => {
            if (!canDrop || !e.dataTransfer.types.includes(DRAG_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            setOver(false);
            const raw = e.dataTransfer.getData(DRAG_MIME);
            if (!raw) return;
            e.preventDefault();
            e.stopPropagation();
            onDropFiles?.(JSON.parse(raw) as string[]);
          }}
          className={cn(
            "group/folder relative flex items-center gap-3 rounded-2xl border bg-card p-3 transition-all duration-200",
            "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft has-[button[data-open]:focus-visible]:ring-3 has-[button[data-open]:focus-visible]:ring-ring/50",
            over && "border-primary bg-secondary ring-2 ring-primary/40",
          )}
        >
          <button type="button" data-open className="absolute inset-0 cursor-pointer rounded-2xl outline-none" aria-label={t("library.card.openFolder", { name: folder.name })} onClick={onOpen} />
          <FolderGlyph color={folder.color} open={over} className="pointer-events-none" />
          <div className="pointer-events-none min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" title={folder.name}>
              <bdi>{folder.name}</bdi>
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {canDrop && folder.studentId && <EyeIcon className="size-3.5 text-info" aria-label={t("library.card.visibleToStudent")} />}
              {count}
            </p>
          </div>
          <div className="relative">
            <ActionsDropdown actions={actions} label={folder.name} />
          </div>
        </div>
      </ContextMenuTrigger>
      {actions.some((a) => !a.hidden) && <ActionsContextMenu actions={actions} label={folder.name} />}
    </ContextMenu>
  );
}

export function FilesSkeleton({ view }: { view: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="space-y-2 rounded-2xl border bg-card p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border bg-card">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  text?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-card/60 px-6 py-14 text-center", className)}>
      <span className="grid size-16 place-items-center rounded-3xl bg-secondary text-secondary-foreground">
        <Icon className="size-8" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-muted-foreground">{text}</p>}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}

/** A rounded toggle used for quick filters. */
export function FilterChip({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.8rem] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground/80 hover:bg-muted",
      )}
    >
      {children}
      {count !== undefined && <span className={cn("tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>{count}</span>}
    </button>
  );
}
