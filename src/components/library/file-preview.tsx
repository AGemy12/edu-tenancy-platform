"use client";

import { useEffect, useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, ExternalLinkIcon, StarIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ActionsDropdown, FileThumb, type MenuAction } from "./file-visual";
import { useI18n, useT } from "@/i18n/provider";
import { KIND_META, displayName, downloadFile, fileUrl, formatBytes } from "@/lib/library";
import type { LibraryFile } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  files: LibraryFile[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /** Shows the actions menu. */
  canEdit: boolean;
  /** Stars are personal: false for center-library files. */
  canStar?: boolean;
  isStudent: boolean;
  actions: (file: LibraryFile) => MenuAction[];
  onToggleStar: (file: LibraryFile) => void;
};

/** Full-screen viewer: images, PDF, video and audio play in place; other types offer a download. */
export function FilePreview({ files, index, onIndexChange, canEdit, canStar = canEdit, isStudent, actions, onToggleStar }: Props) {
  const { t, rich, dir, format } = useI18n();
  const file = index !== null ? files[index] : undefined;
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasPrev = index !== null && index > 0;
  const hasNext = index !== null && index < files.length - 1;

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) return;
      // Arrows follow the reading direction: in RTL the left arrow moves forward.
      const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
      const back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
      if (e.key === forward && index < files.length - 1) onIndexChange(index + 1);
      if (e.key === back && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, files.length, onIndexChange, dir]);

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        // Focus "close" first: the first header button would pop its tooltip on open.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          closeRef.current?.focus();
        }}
        className="flex h-[92dvh] w-[96vw] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1280px)]"
      >
        {file && (
          <>
            <header className="flex items-center gap-3 border-b px-3 py-2.5 sm:px-4">
              <FileThumb file={file} variant="row" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base font-bold"><bdi>{displayName(file)}</bdi></DialogTitle>
                <DialogDescription className="truncate text-xs">
                  {t(`library.kinds.${file.kind}.label`)} · <span dir="ltr">{formatBytes(file.size)}</span>
                  {files.length > 1 && index !== null && (
                    <>
                      {" "}
                      · {t("library.preview.position", { index: index + 1, total: files.length })}
                    </>
                  )}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1">
                {canStar && file.scope !== "SHARED" && (
                  <IconAction label={file.starred ? t("library.menu.unstar") : t("library.menu.star")} onClick={() => onToggleStar(file)}>
                    <StarIcon className={cn(file.starred && "fill-amber-400 text-amber-500")} />
                  </IconAction>
                )}
                {file.previewUrl && (
                  <IconAction label={t("library.preview.openInNewTab")} asLink={fileUrl(file.previewUrl)!}>
                    <ExternalLinkIcon />
                  </IconAction>
                )}
                <Button size="sm" className="hidden sm:inline-flex" onClick={() => downloadFile(file.downloadUrl)}>
                  <DownloadIcon /> {t("common.actions.download")}
                </Button>
                <IconAction label={t("common.actions.download")} className="sm:hidden" onClick={() => downloadFile(file.downloadUrl)}>
                  <DownloadIcon />
                </IconAction>
                {canEdit && <ActionsDropdown actions={actions(file)} label={displayName(file)} />}
                <DialogClose asChild>
                  <Button ref={closeRef} variant="ghost" size="icon-sm" aria-label={t("common.actions.close")}>
                    <XIcon />
                  </Button>
                </DialogClose>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/60 dark:bg-black/40">
                <Stage key={file.id} file={file} />
                {hasPrev && (
                  <NavButton side="start" label={t("library.preview.previous")} onClick={() => onIndexChange(index! - 1)}>
                    <ChevronLeftIcon className="rtl:rotate-180" />
                  </NavButton>
                )}
                {hasNext && (
                  <NavButton side="end" label={t("library.preview.next")} onClick={() => onIndexChange(index! + 1)}>
                    <ChevronRightIcon className="rtl:rotate-180" />
                  </NavButton>
                )}
              </div>

              <aside className="hidden w-72 shrink-0 space-y-5 overflow-y-auto border-s p-5 text-sm lg:block">
                <Info label={t("library.preview.category")}>
                  <Badge variant="secondary">{t(`library.categories.${file.category}`)}</Badge>
                </Info>
                {file.description && (
                  <Info label={t("library.preview.description")}>
                    <p className="leading-relaxed whitespace-pre-line">{file.description}</p>
                  </Info>
                )}
                {isStudent ? (
                  <Info label={t("library.preview.fromTeacher")}>
                    <bdi>{file.owner.fullName}</bdi>
                  </Info>
                ) : (
                  <Info label={t("library.preview.folder")}>
                    <bdi>{file.folder?.name ?? (file.scope === "SHARED" ? t("library.sidebar.shared") : t("library.sidebar.home"))}</bdi>
                  </Info>
                )}
                {!isStudent && file.folder?.studentId && (
                  <p className="rounded-xl bg-info/10 p-3 text-xs leading-relaxed text-info">
                    {rich("library.preview.inStudentFolder", { name: file.folder.studentName })}
                  </p>
                )}
                <Info label={t("library.preview.added")}>{format.longDateTime(file.createdAt)}</Info>
                <Info label={t("library.preview.size")}>
                  <span dir="ltr">{formatBytes(file.size)}</span>
                </Info>
              </aside>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stage({ file }: { file: LibraryFile }) {
  const t = useT();
  const src = fileUrl(file.previewUrl);
  const meta = KIND_META[file.kind];

  if (src && file.kind === "IMAGE") {
    // eslint-disable-next-line @next/next/no-img-element -- signed API URL
    return <img src={src} alt={file.name} className="max-h-full max-w-full object-contain p-2 sm:p-6" />;
  }
  if (src && file.kind === "VIDEO") {
    return <video src={src} controls autoPlay className="max-h-full max-w-full rounded-xl bg-black" />;
  }
  if (src && file.kind === "AUDIO") {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-5 p-6">
        <span className={cn("grid size-28 place-items-center rounded-3xl", meta.tint)}>
          <meta.icon className="size-12" />
        </span>
        <audio src={src} controls autoPlay className="w-full" />
      </div>
    );
  }
  if (src) {
    // PDF and plain text use the browser's own viewer (zoom, search, print).
    return <iframe src={src} title={file.name} className="size-full border-0 bg-white" />;
  }
  return (
    <div className="flex max-w-sm flex-col items-center gap-4 p-6 text-center">
      <span className={cn("grid size-24 place-items-center rounded-3xl", meta.tint)}>
        <meta.icon className="size-11" />
      </span>
      <p className="font-semibold">{t("library.preview.unavailable")}</p>
      <p className="text-sm text-muted-foreground">{t("library.preview.unavailableHint")}</p>
      <Button onClick={() => downloadFile(file.downloadUrl)}>
        <DownloadIcon /> {t("library.preview.downloadWithSize", { size: formatBytes(file.size) })}
      </Button>
    </div>
  );
}

function NavButton({ side, label, onClick, children }: { side: "start" | "end"; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label={label}
      onClick={onClick}
      className={cn("absolute top-1/2 -translate-y-1/2 bg-background/90 shadow-soft backdrop-blur", side === "start" ? "start-3" : "end-3")}
    >
      {children}
    </Button>
  );
}

function IconAction({
  label,
  onClick,
  asLink,
  className,
  children,
}: {
  label: string;
  onClick?: () => void;
  asLink?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {asLink ? (
          <Button variant="ghost" size="icon-sm" aria-label={label} className={className} asChild>
            <a href={asLink} target="_blank" rel="noreferrer">
              {children}
            </a>
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label={label} className={className} onClick={onClick}>
            {children}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div>{children}</div>
    </div>
  );
}
