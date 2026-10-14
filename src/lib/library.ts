import {
  BookOpenTextIcon,
  FileArchiveIcon,
  FileIcon,
  FileMusicIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileVideoCameraIcon,
  ImageIcon,
  PresentationIcon,
  type LucideIcon,
} from "lucide-react";
import { API_URL } from "./api";
import type { FileCategory, FileKind, FolderColor, LibraryFolder } from "./types";

/* ───────── File kinds (detected by the API from the extension) ───────── */

/** Icon and tint per kind; the names are in the `library.kinds` messages. */
export const KIND_META: Record<FileKind, { icon: LucideIcon; tint: string }> = {
  PDF: { icon: FileTextIcon, tint: "bg-rose-500/12 text-rose-600 dark:text-rose-300" },
  IMAGE: { icon: ImageIcon, tint: "bg-violet-500/12 text-violet-600 dark:text-violet-300" },
  DOCUMENT: { icon: FileTextIcon, tint: "bg-sky-500/12 text-sky-600 dark:text-sky-300" },
  PRESENTATION: { icon: PresentationIcon, tint: "bg-orange-500/12 text-orange-600 dark:text-orange-300" },
  SPREADSHEET: { icon: FileSpreadsheetIcon, tint: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" },
  EBOOK: { icon: BookOpenTextIcon, tint: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  VIDEO: { icon: FileVideoCameraIcon, tint: "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-300" },
  AUDIO: { icon: FileMusicIcon, tint: "bg-teal-500/12 text-teal-600 dark:text-teal-300" },
  ARCHIVE: { icon: FileArchiveIcon, tint: "bg-slate-500/12 text-slate-600 dark:text-slate-300" },
  OTHER: { icon: FileIcon, tint: "bg-slate-500/12 text-slate-600 dark:text-slate-300" },
};

export const KIND_ORDER: FileKind[] = ["PDF", "IMAGE", "DOCUMENT", "PRESENTATION", "SPREADSHEET", "EBOOK", "VIDEO", "AUDIO", "ARCHIVE", "OTHER"];

/* ───────── Categories (chosen by the teacher; names in `library.categories`) ───────── */

export const CATEGORY_ORDER: FileCategory[] = ["BOOK", "EXPLANATION", "WORKSHEET", "SUMMARY", "EXAM", "OTHER"];

/* ───────── Folder colors (names in `library.colors`) ───────── */

export const FOLDER_COLORS: Record<FolderColor, { swatch: string; icon: string }> = {
  teal: { swatch: "bg-teal-500", icon: "text-teal-600 dark:text-teal-300 bg-teal-500/12" },
  coral: { swatch: "bg-orange-500", icon: "text-orange-600 dark:text-orange-300 bg-orange-500/12" },
  amber: { swatch: "bg-amber-400", icon: "text-amber-600 dark:text-amber-300 bg-amber-400/15" },
  sky: { swatch: "bg-sky-500", icon: "text-sky-600 dark:text-sky-300 bg-sky-500/12" },
  violet: { swatch: "bg-violet-500", icon: "text-violet-600 dark:text-violet-300 bg-violet-500/12" },
  rose: { swatch: "bg-rose-500", icon: "text-rose-600 dark:text-rose-300 bg-rose-500/12" },
  slate: { swatch: "bg-slate-500", icon: "text-slate-600 dark:text-slate-300 bg-slate-500/12" },
};

export const folderTint = (color: FolderColor | null | undefined) => FOLDER_COLORS[color ?? "teal"].icon;

/* ───────── Upload rules (mirror the API allow-list for instant feedback) ───────── */

export const EXTENSION_KIND: Record<string, FileKind> = {
  pdf: "PDF",
  jpg: "IMAGE", jpeg: "IMAGE", png: "IMAGE", gif: "IMAGE", webp: "IMAGE", avif: "IMAGE",
  doc: "DOCUMENT", docx: "DOCUMENT", odt: "DOCUMENT", rtf: "DOCUMENT", txt: "DOCUMENT",
  ppt: "PRESENTATION", pptx: "PRESENTATION", odp: "PRESENTATION",
  xls: "SPREADSHEET", xlsx: "SPREADSHEET", ods: "SPREADSHEET", csv: "SPREADSHEET",
  epub: "EBOOK",
  mp4: "VIDEO", webm: "VIDEO", mov: "VIDEO",
  mp3: "AUDIO", m4a: "AUDIO", wav: "AUDIO", ogg: "AUDIO",
  zip: "ARCHIVE", rar: "ARCHIVE", "7z": "ARCHIVE",
};

export const ALLOWED_EXTENSIONS = Object.keys(EXTENSION_KIND);

export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

/**
 * Name without its extension: a Latin ".pdf" at the end of an Arabic name renders on the
 * wrong side under the bidi algorithm, and the type is already shown next to the name.
 */
export function displayName(file: { name: string; extension: string }) {
  const suffix = `.${file.extension}`;
  return file.extension && file.name.toLowerCase().endsWith(suffix) && file.name.length > suffix.length
    ? file.name.slice(0, -suffix.length)
    : file.name;
}

export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/* ───────── Formatting ───────── */

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/** Signed links come back relative to the API (local storage) or absolute (object storage). */
export function fileUrl(url: string | null) {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${API_URL}${url}`;
}

/** Triggers a browser download for a signed attachment link. */
export function downloadFile(url: string) {
  const a = document.createElement("a");
  a.href = fileUrl(url)!;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ───────── Folder tree helpers ───────── */

export type FolderNode = LibraryFolder & { children: FolderNode[] };

export function buildTree(folders: LibraryFolder[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>(folders.map((f) => [f.id, { ...f, children: [] }]));
  const roots: FolderNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: FolderNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** Folder chain from the top down to `id` (for breadcrumbs). */
export function pathTo(id: string, folders: LibraryFolder[]): LibraryFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const chain: LibraryFolder[] = [];
  for (let cur = byId.get(id); cur && chain.length < 20; cur = cur.parentId ? byId.get(cur.parentId) : undefined) {
    chain.unshift(cur);
  }
  return chain;
}

/** `id` and every folder below it. */
export function descendantIds(id: string, folders: LibraryFolder[]): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id);
        grew = true;
      }
    }
  }
  return out;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => w && !w.endsWith("."))
    .slice(0, 2)
    .map((w) => w[0])
    .join(" ");
}
