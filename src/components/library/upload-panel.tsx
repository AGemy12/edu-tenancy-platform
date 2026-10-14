"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, CircleAlertIcon, CircleCheckIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { libraryKeys } from "@/hooks/use-library";
import { useT } from "@/i18n/provider";
import { EXTENSION_KIND, KIND_META, extensionOf, formatBytes } from "@/lib/library";
import { useUploads, type UploadError, type UploadItem } from "@/stores/upload-store";
import { cn } from "@/lib/utils";

/** Floating progress panel for the upload queue (bottom corner, like a cloud drive). */
export function UploadPanel() {
  const t = useT();
  const qc = useQueryClient();
  const { items, cancel, retry, clearFinished, setOnUploaded } = useUploads();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setOnUploaded(() => qc.invalidateQueries({ queryKey: libraryKeys.all }));
    return () => setOnUploaded(null);
  }, [qc, setOnUploaded]);

  const active = items.filter((i) => i.status === "queued" || i.status === "uploading");
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;

  // Leaving the page would abort running uploads.
  useEffect(() => {
    if (!active.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active.length]);

  if (!items.length) return null;

  const overall = active.length
    ? Math.round(items.filter((i) => i.status !== "canceled" && i.status !== "error").reduce((s, i) => s + i.progress, 0) / Math.max(1, items.length - failed))
    : 100;

  const title = active.length
    ? t("library.upload.uploading", { count: active.length })
    : failed
      ? t("library.upload.summary", { done, failed })
      : t("library.upload.uploaded", { count: done });

  return (
    <section
      aria-label={t("library.upload.panel")}
      aria-live="polite"
      className="fixed bottom-4 start-4 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-popover shadow-2xl"
    >
      <header className="flex items-center gap-2 bg-muted/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{title}</p>
          {active.length > 0 && <Progress value={overall} className="mt-2 h-1.5" />}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={collapsed ? t("library.upload.expand") : t("library.upload.collapse")} aria-expanded={!collapsed} onClick={() => setCollapsed((c) => !c)}>
          <ChevronDownIcon className={cn("transition-transform", collapsed && "rotate-180")} />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={t("common.actions.close")} disabled={active.length > 0} onClick={clearFinished}>
          <XIcon />
        </Button>
      </header>
      {!collapsed && (
        <ul className="max-h-72 divide-y overflow-y-auto">
          {items.map((item) => (
            <UploadRow key={item.id} item={item} onCancel={() => cancel(item.id)} onRetry={() => retry(item.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function UploadRow({ item, onCancel, onRetry }: { item: UploadItem; onCancel: () => void; onRetry: () => void }) {
  const t = useT();
  const error = item.error && errorText(item.error, t);
  const meta = KIND_META[EXTENSION_KIND[extensionOf(item.file.name)] ?? "OTHER"];
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", meta.tint)}>
        <meta.icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.file.name}>
          <bdi>{item.file.name}</bdi>
        </p>
        {item.status === "uploading" ? (
          <Progress value={item.progress} className="mt-1.5 h-1" />
        ) : item.status === "error" ? (
          <p className="line-clamp-2 text-xs text-destructive" title={error}>
            {error}
          </p>
        ) : (
          <p className="truncate text-xs text-muted-foreground">
            {item.status === "queued" && `${t("library.upload.queued")} · `}
            {item.status === "canceled" && `${t("library.upload.canceled")} · `}
            <span dir="ltr">{formatBytes(item.file.size)}</span> · <bdi>{item.folderName}</bdi>
          </p>
        )}
      </div>
      {item.status === "done" && <CircleCheckIcon className="size-5 shrink-0 text-success" aria-label={t("library.upload.done")} />}
      {item.status === "error" && (
        <>
          <CircleAlertIcon className="size-5 shrink-0 text-destructive" aria-hidden="true" />
          <Button variant="ghost" size="icon-xs" aria-label={t("common.actions.retry")} onClick={onRetry}>
            <RotateCcwIcon />
          </Button>
        </>
      )}
      {(item.status === "queued" || item.status === "uploading") && (
        <Button variant="ghost" size="icon-xs" aria-label={t("library.upload.cancel")} onClick={onCancel}>
          <XIcon />
        </Button>
      )}
    </li>
  );
}

/** Upload errors are stored as data (see upload-store) and translated here. */
function errorText(error: UploadError, t: ReturnType<typeof useT>) {
  return "key" in error ? t(error.key, error.params) : error.text;
}
