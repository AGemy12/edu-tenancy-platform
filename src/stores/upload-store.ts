import axios from "axios";
import { create } from "zustand";
import { api, getErrorMessage } from "@/lib/api";
import { ALLOWED_EXTENSIONS, extensionOf, formatBytes } from "@/lib/library";
import type { FileCategory, LibraryScope } from "@/lib/types";
import type { MessageKey } from "@/i18n/messages";
import type { Params } from "@/i18n/translate";

export type UploadStatus = "queued" | "uploading" | "done" | "error" | "canceled";

/**
 * The store lives outside React and can't translate, so errors are kept as data:
 * a message key (translated when rendered) or text the API already localized.
 */
export type UploadError = { key: MessageKey; params?: Params } | { text: string };

/** Who sees the "out of space" message: the admin can upgrade the package, a teacher asks the admin. */
export type QuotaAudience = "admin" | "teacher";

export type UploadItem = {
  id: string;
  file: File;
  scope: LibraryScope;
  folderId: string | null;
  folderName: string;
  category?: FileCategory;
  status: UploadStatus;
  /** 0–100 */
  progress: number;
  error?: UploadError;
  /** Kept so a retry re-checks the per-file limit. */
  limits: Limits;
};

type Limits = { maxFileBytes?: number; audience: QuotaAudience };

type EnqueueOptions = {
  scope: LibraryScope;
  folderId: string | null;
  folderName: string;
  category?: FileCategory;
  /** Per-file limit of the package. */
  maxFileBytes?: number;
  /** Space left in the target quota (personal or center library); undefined = unknown, the API decides. */
  freeBytes?: number;
  audience: QuotaAudience;
};

type UploadState = {
  items: UploadItem[];
  enqueue: (files: File[], opts: EnqueueOptions) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  clearFinished: () => void;
  /** Called (throttled) after files finish uploading, to refresh the library views. */
  onUploaded: (() => void) | null;
  setOnUploaded: (fn: (() => void) | null) => void;
};

const CONCURRENCY = 3;
const controllers = new Map<string, AbortController>();
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

function validate(file: File, limits: Limits): UploadError | undefined {
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) return { key: "library.upload.errors.unsupported" };
  if (file.size === 0) return { key: "library.upload.errors.empty" };
  const max = limits.maxFileBytes;
  if (max && file.size > max) {
    return {
      key: limits.audience === "admin" ? "library.quota.errors.fileTooBigAdmin" : "library.quota.errors.fileTooBig",
      params: { max: formatBytes(max) },
    };
  }
}

function noSpace(scope: LibraryScope, audience: QuotaAudience, free: number): UploadError {
  const key =
    scope === "SHARED"
      ? audience === "admin"
        ? "library.quota.errors.sharedNoSpaceAdmin"
        : "library.quota.errors.sharedNoSpaceTeacher"
      : audience === "admin"
        ? "library.quota.errors.noSpaceAdmin"
        : "library.quota.errors.noSpaceTeacher";
  return { key, params: { free: formatBytes(Math.max(0, free)) } };
}

/**
 * The API localizes its messages (Accept-Language), so those are shown as-is. A 413 without
 * one comes from a proxy in front of the API (no JSON body) and gets our own "too large" text.
 */
function uploadError(err: unknown): UploadError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: unknown } | undefined;
    const fromApi = typeof data?.message === "string" || Array.isArray(data?.message);
    if (!fromApi && err.response?.status === 413) return { key: "library.upload.errors.tooLarge" };
    if (!fromApi && err.response) return { key: "library.upload.errors.failed" };
  }
  return { text: getErrorMessage(err) };
}

export const useUploads = create<UploadState>()((set, get) => {
  const patch = (id: string, data: Partial<UploadItem>) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...data } : i)) }));

  const notify = () => {
    if (notifyTimer) return;
    notifyTimer = setTimeout(() => {
      notifyTimer = null;
      get().onUploaded?.();
    }, 600);
  };

  async function run(item: UploadItem) {
    const controller = new AbortController();
    controllers.set(item.id, controller);
    patch(item.id, { status: "uploading", progress: 0, error: undefined });

    const body = new FormData();
    body.append("scope", item.scope);
    if (item.folderId) body.append("folderId", item.folderId);
    if (item.category) body.append("category", item.category);
    body.append("file", item.file, item.file.name);

    try {
      await api.post("/library/files", body, {
        // Explicit multipart so axios doesn't JSON-encode the FormData; the browser adds the boundary.
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal,
        onUploadProgress: (e) => {
          if (e.total) patch(item.id, { progress: Math.min(99, Math.round((e.loaded / e.total) * 100)) });
        },
      });
      patch(item.id, { status: "done", progress: 100 });
      notify();
    } catch (err) {
      if (axios.isCancel(err)) {
        patch(item.id, { status: "canceled" });
      } else {
        patch(item.id, { status: "error", error: uploadError(err) });
      }
    } finally {
      controllers.delete(item.id);
      pump();
    }
  }

  function pump() {
    const { items } = get();
    let active = items.filter((i) => i.status === "uploading").length;
    for (const item of items) {
      if (active >= CONCURRENCY) break;
      if (item.status === "queued") {
        active++;
        void run(item);
      }
    }
  }

  return {
    items: [],
    onUploaded: null,
    setOnUploaded: (fn) => set({ onUploaded: fn }),

    enqueue: (files, opts) => {
      const limits: Limits = { maxFileBytes: opts.maxFileBytes, audience: opts.audience };
      // Files already waiting for the same quota count against the space that is left.
      const pending = get()
        .items.filter((i) => i.scope === opts.scope && (i.status === "queued" || i.status === "uploading"))
        .reduce((sum, i) => sum + i.file.size, 0);
      let free = opts.freeBytes === undefined ? Infinity : opts.freeBytes - pending;

      const added: UploadItem[] = files.map((file) => {
        let error = validate(file, limits);
        if (!error && file.size > free) error = noSpace(opts.scope, opts.audience, free);
        if (!error) free -= file.size;
        return {
          id: crypto.randomUUID(),
          file,
          scope: opts.scope,
          limits,
          folderId: opts.folderId,
          folderName: opts.folderName,
          category: opts.category,
          status: error ? "error" : "queued",
          progress: 0,
          error,
        };
      });
      set((s) => ({ items: [...s.items, ...added] }));
      pump();
    },

    cancel: (id) => {
      const controller = controllers.get(id);
      if (controller) controller.abort();
      else patch(id, { status: "canceled" });
    },

    retry: (id) => {
      const item = get().items.find((i) => i.id === id);
      if (!item || validate(item.file, item.limits)) return;
      patch(id, { status: "queued", progress: 0, error: undefined });
      pump();
    },

    clearFinished: () => set((s) => ({ items: s.items.filter((i) => i.status === "queued" || i.status === "uploading") })),
  };
});
