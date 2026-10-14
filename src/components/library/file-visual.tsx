"use client";

import { useState } from "react";
import { FolderClosedIcon, FolderOpenIcon, type LucideIcon } from "lucide-react";
import { EllipsisVerticalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "@/components/ui/context-menu";
import { useT } from "@/i18n/provider";
import { KIND_META, fileUrl, folderTint } from "@/lib/library";
import type { FolderColor, LibraryFile } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Thumbnail for images, otherwise a tinted type icon with the extension. */
export function FileThumb({ file, variant = "card", className }: { file: LibraryFile; variant?: "card" | "row"; className?: string }) {
  const [broken, setBroken] = useState(false);
  const meta = KIND_META[file.kind];
  const thumb = !broken && fileUrl(file.thumbnailUrl);

  if (variant === "row") {
    return (
      <span className={cn("relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl", !thumb && meta.tint, className)}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed API URL, not a static asset
          <img src={thumb} alt="" loading="lazy" className="size-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <meta.icon className="size-5" aria-hidden="true" />
        )}
      </span>
    );
  }

  return (
    <div className={cn("relative grid aspect-[4/3] place-items-center overflow-hidden", !thumb && meta.tint, className)}>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed API URL, not a static asset
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <meta.icon className="size-11 stroke-[1.5]" aria-hidden="true" />
          <span className="rounded-md bg-background/70 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase" dir="ltr">
            {file.extension}
          </span>
        </div>
      )}
    </div>
  );
}

export function FolderGlyph({ color, open, className }: { color: FolderColor | null; open?: boolean; className?: string }) {
  const Icon = open ? FolderOpenIcon : FolderClosedIcon;
  return (
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", folderTint(color), className)}>
      <Icon className="size-5.5" aria-hidden="true" />
    </span>
  );
}

/* ───────── One menu definition, rendered as a "⋮" dropdown or a right-click menu ───────── */

export type MenuAction = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  separatorBefore?: boolean;
  hidden?: boolean;
};

const itemClass = "gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer";

export function ActionsDropdown({ actions, label, className }: { actions: MenuAction[]; label: string; className?: string }) {
  const t = useT();
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("library.menu.actionsFor", { name: label })}
          className={cn("text-muted-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground", className)}
          onClick={(e) => e.stopPropagation()}
        >
          <EllipsisVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="max-w-60 truncate">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {visible.map((a, i) => (
          <div key={a.label}>
            {a.separatorBefore && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem variant={a.destructive ? "destructive" : "default"} className={itemClass} onSelect={a.onSelect}>
              <a.icon />
              {a.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ActionsContextMenu({ actions, label }: { actions: MenuAction[]; label: string }) {
  const visible = actions.filter((a) => !a.hidden);
  return (
    <ContextMenuContent className="min-w-48">
      <ContextMenuLabel className="max-w-60 truncate">{label}</ContextMenuLabel>
      <ContextMenuSeparator />
      {visible.map((a, i) => (
        <div key={a.label}>
          {a.separatorBefore && i > 0 && <ContextMenuSeparator />}
          <ContextMenuItem variant={a.destructive ? "destructive" : "default"} className={itemClass} onSelect={a.onSelect}>
            <a.icon />
            {a.label}
          </ContextMenuItem>
        </div>
      ))}
    </ContextMenuContent>
  );
}
