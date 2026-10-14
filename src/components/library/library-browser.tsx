"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownUpIcon,
  Building2Icon,
  CloudUploadIcon,
  CopyPlusIcon,
  DownloadIcon,
  EyeIcon,
  FolderClosedIcon,
  FolderInputIcon,
  FolderPlusIcon,
  LayoutGridIcon,
  ListIcon,
  Loader2Icon,
  LockIcon,
  PencilIcon,
  SearchIcon,
  SearchXIcon,
  SendIcon,
  StarIcon,
  TagIcon,
  Trash2Icon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useCreateFolder,
  useDeleteFiles,
  useDeleteFolder,
  useEnsureStudentFolder,
  useFiles,
  useFolders,
  useImportFiles,
  useLibraryUsage,
  useMoveFiles,
  useSendFiles,
  useStudentFolders,
  useUpdateFile,
  useUpdateFolder,
  type FileQuery,
} from "@/hooks/use-library";
import { useI18n, useT } from "@/i18n/provider";
import { getErrorMessage } from "@/lib/api";
import {
  ACCEPT_ATTR,
  CATEGORY_ORDER,
  KIND_META,
  KIND_ORDER,
  descendantIds,
  displayName,
  downloadFile,
  initials,
  pathTo,
} from "@/lib/library";
import type { FileCategory, FileKind, LibraryFile, LibraryFolder, LibraryScope, StudentFolder } from "@/lib/types";
import { useUploads } from "@/stores/upload-store";
import { cn } from "@/lib/utils";
import { EmptyState, FileCard, FileListView, FilesSkeleton, FilterChip, FolderCard, type SelectGesture } from "./file-views";
import { FilePreview } from "./file-preview";
import { LibrarySidebar, type Section } from "./library-sidebar";
import { ConfirmDialog, FileEditDialog, FolderDialog, MoveDialog, SendDialog } from "./library-dialogs";
import { UploadPanel } from "./upload-panel";
import type { MenuAction } from "./file-visual";

type SortKey = "newest" | "oldest" | "name" | "size";

/** Labels are `library.sort.<key>`. */
const SORTS: Record<SortKey, { sort: FileQuery["sort"]; order: FileQuery["order"] }> = {
  newest: { sort: "createdAt", order: "desc" },
  oldest: { sort: "createdAt", order: "asc" },
  name: { sort: "name", order: "asc" },
  size: { sort: "size", order: "desc" },
};

const VIEW_KEY = "edu.library.view";

type FolderDialogState = { mode: "create"; parentId: string | null; scope: LibraryScope } | { mode: "edit"; folder: LibraryFolder } | null;
type MoveState = { kind: "files"; ids: string[]; currentId: string | null } | { kind: "folder"; folder: LibraryFolder } | null;
/** `name` is set when deleting a single file; otherwise the dialog shows a count. */
type ConfirmState = { kind: "files"; ids: string[]; name?: string } | { kind: "folder"; folder: LibraryFolder } | null;

/* ───────── URL state: folder, section and filters live in the query string ───────── */

const STAFF_SECTIONS: Section[] = ["home", "all", "starred", "recent", "students", "shared"];
const STUDENT_SECTIONS: Section[] = ["all", "recent"];

/**
 * `?section=` picks a view (none = "My library", or "All files" for students). The center library is
 * `?section=shared`, and its folders keep it: `?section=shared&folder=<id>`. A `folder` without it is
 * one of the caller's own folders.
 */
function useLibraryLocation(isStudent: boolean) {
  const params = useSearchParams();
  const folderId = params.get("folder");
  const rawSection = params.get("section") as Section | null;
  const allowed = isStudent ? STUDENT_SECTIONS : STAFF_SECTIONS;
  const section: Section = rawSection && allowed.includes(rawSection) ? rawSection : isStudent ? "all" : "home";
  const q = params.get("q") ?? "";
  const kind = (params.get("kind") as FileKind | null) ?? undefined;
  const category = (params.get("cat") as FileCategory | null) ?? undefined;
  const sortKey = (params.get("sort") as SortKey | null) ?? "newest";

  const update = useCallback(
    (patch: Record<string, string | null>, mode: "push" | "replace" = "push") => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const qs = next.toString();
      window.history[mode === "push" ? "pushState" : "replaceState"](null, "", qs ? `?${qs}` : window.location.pathname);
    },
    [params],
  );

  return { folderId, section, q, kind, category, sortKey: SORTS[sortKey] ? sortKey : "newest", update };
}

function useViewMode() {
  const [view, setView] = useState<"grid" | "list">(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  const change = (v: "grid" | "list") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };
  return [view, change] as const;
}

export function LibraryBrowser() {
  const { t, rich, dir } = useI18n();
  const { user } = useCurrentUser();
  const isStudent = user?.role === "STUDENT";
  const isAdmin = user?.role === "TENANT_ADMIN";
  const canEdit = !isStudent;
  const loc = useLibraryLocation(isStudent);
  const [view, setView] = useViewMode();

  /* Scope: the caller's own library, or the center library (?section=shared). Never mixed in one view. */
  const isShared = loc.section === "shared";
  const scope: LibraryScope = isShared ? "SHARED" : "PERSONAL";

  const folders = useFolders("PERSONAL");
  const sharedFolders = useFolders("SHARED", canEdit);
  const scopeFolders = isShared ? sharedFolders : folders;
  const studentFolders = useStudentFolders(canEdit);
  const usage = useLibraryUsage(canEdit);
  const canManageShared = Boolean(usage.data?.shared.canManage);
  /** Upload, organize and delete here (everyone else can still preview, download, send and add to their library). */
  const canManageHere = isShared ? canManageShared : canEdit;

  const currentFolder = loc.folderId ? scopeFolders.data?.find((f) => f.id === loc.folderId) : undefined;
  const crumbs = useMemo(
    () => (loc.folderId && scopeFolders.data ? pathTo(loc.folderId, scopeFolders.data) : []),
    [loc.folderId, scopeFolders.data],
  );
  const searching = loc.q.trim().length > 0;
  const filtering = searching || Boolean(loc.kind || loc.category);
  const showStudentsOverview = !loc.folderId && loc.section === "students" && !searching;
  /** The root of a library lists only its top-level files, so their folder isn't worth showing. */
  const showFolder = searching || (!loc.folderId && loc.section !== "home" && !isShared);

  /* files query for the current location */
  const fileQuery: FileQuery = useMemo(() => {
    const s = SORTS[loc.sortKey];
    const base: FileQuery = { kind: loc.kind, category: loc.category, sort: s.sort, order: s.order };
    if (searching) return { ...base, q: loc.q.trim() };
    if (loc.folderId) return { ...base, folderId: loc.folderId };
    if (loc.section === "home" || loc.section === "shared") return { ...base, folderId: "root" };
    if (loc.section === "starred") return { ...base, starred: true };
    if (loc.section === "recent") return { ...base, sort: "createdAt", order: "desc" };
    return base;
  }, [loc.folderId, loc.section, loc.q, loc.kind, loc.category, loc.sortKey, searching]);

  const files = useFiles(scope, fileQuery, !showStudentsOverview);
  const fileList = useMemo(() => files.data?.pages.flatMap((p) => p.data) ?? [], [files.data]);
  const firstPage = files.data?.pages[0];
  const facets = firstPage?.facets ?? {};
  const facetTotal = Object.values(facets).reduce((a, b) => a + (b ?? 0), 0);

  /* folders shown above the files */
  const visibleFolders = useMemo(() => {
    const list = scopeFolders.data;
    if (filtering || !list) return [];
    if (loc.folderId) return list.filter((f) => f.parentId === loc.folderId);
    if (isShared) return list.filter((f) => !f.parentId);
    if (isStudent && loc.section === "all") return list.filter((f) => !f.parentId);
    if (!isStudent && loc.section === "home") return list.filter((f) => !f.parentId && !f.studentId);
    return [];
  }, [filtering, scopeFolders.data, loc.folderId, loc.section, isShared, isStudent]);

  /* ───────── mutations & dialogs ───────── */

  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const ensureStudent = useEnsureStudentFolder();
  const updateFile = useUpdateFile();
  const moveFiles = useMoveFiles();
  const deleteFiles = useDeleteFiles();
  const sendFiles = useSendFiles();
  const importFiles = useImportFiles();
  const enqueue = useUploads((s) => s.enqueue);

  const [folderDialog, setFolderDialog] = useState<FolderDialogState>(null);
  const [editFile, setEditFile] = useState<LibraryFile | null>(null);
  const [move, setMove] = useState<MoveState>(null);
  const [sendIds, setSendIds] = useState<string[] | null>(null);
  const [importIds, setImportIds] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  /* ───────── selection ───────── */

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const locationKey = `${loc.folderId}|${loc.section}|${loc.q}|${loc.kind}|${loc.category}`;
  const [prevKey, setPrevKey] = useState(locationKey);
  if (prevKey !== locationKey) {
    // Leaving a view drops its selection.
    setPrevKey(locationKey);
    setSelected(new Set());
    setAnchor(null);
  }

  const select = (index: number, g: SelectGesture) => {
    const id = fileList[index].id;
    setSelected((prev) => {
      const next = new Set(g.toggle || g.range ? prev : []);
      if (g.range && anchor !== null) {
        const [a, b] = [Math.min(anchor, index), Math.max(anchor, index)];
        for (let i = a; i <= b; i++) next.add(fileList[i].id);
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!g.range) setAnchor(index);
  };
  const selectedIds = [...selected];
  const clearSelection = () => setSelected(new Set());

  /* ───────── navigation ───────── */

  const goFolder = (id: string, target: LibraryScope = scope) => {
    loc.update({ folder: id, section: target === "SHARED" ? "shared" : null, q: null, kind: null, cat: null });
    setMobileNav(false);
  };
  const goSection = (s: Section) => {
    loc.update({ folder: null, section: s === (isStudent ? "all" : "home") ? null : s, q: null, kind: null, cat: null });
    setMobileNav(false);
  };
  const openStudent = (s: StudentFolder) => {
    if (s.folderId) return goFolder(s.folderId);
    ensureStudent.mutate(s.studentId, { onSuccess: (folder) => goFolder(folder.id) });
  };

  /* ───────── search box (debounced into the URL) ───────── */

  const [searchText, setSearchText] = useState(loc.q);
  const [prevQ, setPrevQ] = useState(loc.q);
  if (prevQ !== loc.q) {
    setPrevQ(loc.q);
    setSearchText(loc.q);
  }
  const { q: urlQ, update: updateUrl } = loc;
  useEffect(() => {
    if (searchText === urlQ) return;
    const t = setTimeout(() => updateUrl({ q: searchText || null }, "replace"), 300);
    return () => clearTimeout(t);
  }, [searchText, urlQ, updateUrl]);

  /* ───────── uploads ───────── */

  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget =
    !canManageHere || showStudentsOverview
      ? null
      : { folderId: currentFolder?.id ?? null, folderName: currentFolder?.name ?? (isShared ? t("library.sidebar.shared") : t("library.sidebar.home")) };
  const startUpload = (list: FileList | File[] | null) => {
    if (!uploadTarget || !list?.length) return;
    const bucket = isShared ? usage.data?.shared : usage.data?.personal;
    enqueue(Array.from(list), {
      ...uploadTarget,
      scope,
      // Uploading while filtered by a category (e.g. books) tags the new files with it.
      category: loc.category,
      // Checked here for instant feedback; the API enforces the same limits.
      maxFileBytes: usage.data?.maxFileBytes,
      freeBytes: bucket ? Math.max(0, bucket.quotaBytes - bucket.usedBytes) : undefined,
      audience: isAdmin ? "admin" : "teacher",
    });
  };

  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

  /* ───────── keyboard shortcuts ───────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, [role=dialog], [role=menu]")) return;
      if (e.key === "Escape" && selected.size) clearSelection();
      if ((e.key === "Delete" || e.key === "Backspace") && selected.size && canManageHere) {
        setConfirm({ kind: "files", ids: [...selected] });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && canEdit && fileList.length) {
        e.preventDefault();
        setSelected(new Set(fileList.map((f) => f.id)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, canEdit, canManageHere, fileList]);

  /* ───────── infinite scroll ───────── */

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = files;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /* ───────── menus ───────── */

  const toggleStar = (f: LibraryFile) => updateFile.mutate({ id: f.id, starred: !f.starred });

  /** `inPreview` hides "Preview" in the viewer's own menu. Center-library files have no star (stars are personal). */
  const fileActions = (f: LibraryFile, inPreview = false): MenuAction[] => [
    { label: t("library.menu.preview"), icon: EyeIcon, onSelect: () => setPreviewIndex(fileList.findIndex((x) => x.id === f.id)), hidden: inPreview },
    { label: t("common.actions.download"), icon: DownloadIcon, onSelect: () => downloadFile(f.downloadUrl) },
    { label: t("library.shared.addToMine"), icon: CopyPlusIcon, onSelect: () => setImportIds([f.id]), hidden: !canEdit || !isShared, separatorBefore: true },
    { label: t("library.menu.sendToStudents"), icon: SendIcon, onSelect: () => setSendIds([f.id]), hidden: !canEdit, separatorBefore: !isShared },
    { label: t("library.menu.moveTo"), icon: FolderInputIcon, onSelect: () => setMove({ kind: "files", ids: [f.id], currentId: f.folderId }), hidden: !canManageHere },
    { label: f.starred ? t("library.menu.unstar") : t("library.menu.star"), icon: StarIcon, onSelect: () => toggleStar(f), hidden: !canEdit || isShared },
    { label: t("library.menu.editDetails"), icon: PencilIcon, onSelect: () => setEditFile(f), hidden: !canManageHere },
    { label: t("common.actions.delete"), icon: Trash2Icon, destructive: true, separatorBefore: true, hidden: !canManageHere, onSelect: () => setConfirm({ kind: "files", ids: [f.id], name: displayName(f) }) },
  ];

  const folderActions = (f: LibraryFolder): MenuAction[] => [
    { label: t("common.actions.open"), icon: FolderClosedIcon, onSelect: () => goFolder(f.id), hidden: !canEdit },
    { label: t("library.menu.newSubfolder"), icon: FolderPlusIcon, onSelect: () => setFolderDialog({ mode: "create", parentId: f.id, scope }), hidden: !canManageHere },
    { label: f.isStudentRoot ? t("library.menu.changeColor") : t("library.menu.renameAndColor"), icon: PencilIcon, onSelect: () => setFolderDialog({ mode: "edit", folder: f }), hidden: !canManageHere },
    { label: t("library.menu.moveTo"), icon: FolderInputIcon, onSelect: () => setMove({ kind: "folder", folder: f }), hidden: !canManageHere || f.isStudentRoot },
    { label: t("common.actions.delete"), icon: Trash2Icon, destructive: true, separatorBefore: true, onSelect: () => setConfirm({ kind: "folder", folder: f }), hidden: !canManageHere },
  ];

  /** Dragged files come from the current view: they move within its library, or center-library files dropped on your own folders are added to them. */
  const dropFilesOn = (folderId: string | null, ids: string[], target: LibraryScope = scope) => {
    if (!canEdit || !ids.length) return;
    if (isShared && target === "PERSONAL") {
      importFiles.mutate({ ids, folderId }, { onSuccess: clearSelection });
      return;
    }
    if (target !== scope || !canManageHere) return;
    moveFiles.mutate({ ids, folderId }, { onSuccess: clearSelection });
  };

  const itemProps = (f: LibraryFile, i: number) => ({
    file: f,
    selected: selected.has(f.id),
    selectMode: selected.size > 0,
    selectable: canEdit,
    canStar: canEdit && !isShared,
    draggable: canEdit,
    showFolder,
    actions: fileActions(f),
    onOpen: () => setPreviewIndex(i),
    onSelect: (g: SelectGesture) => select(i, g),
    onToggleStar: () => toggleStar(f),
    dragIds: () => (selected.has(f.id) ? selectedIds : [f.id]),
  });

  /* ───────── header text ───────── */

  const title = isStudent ? t("library.header.titleStudent") : t("library.header.title");
  const subtitle = isStudent ? t("library.header.subtitleStudent") : t("library.header.subtitle");
  const sectionLabel: Record<Section, string> = {
    home: t("library.sidebar.home"),
    all: isStudent ? t("library.sidebar.allStudent") : t("library.sidebar.all"),
    starred: t("library.sidebar.starred"),
    recent: t("library.sidebar.recent"),
    students: t("library.sidebar.students"),
    shared: t("library.sidebar.shared"),
  };
  /** Where the breadcrumb trail starts for the open folder. */
  const rootSection: Section = isShared ? "shared" : crumbs[0]?.studentId && !isStudent ? "students" : isStudent ? "all" : "home";
  const newFolderHere = () => setFolderDialog({ mode: "create", parentId: currentFolder && !filtering ? currentFolder.id : null, scope });

  const sidebar = (
    <LibrarySidebar
      isStudent={isStudent}
      isAdmin={isAdmin}
      section={loc.section}
      folderId={loc.folderId}
      scope={scope}
      folders={folders.data}
      sharedFolders={sharedFolders.data}
      canManageShared={canManageShared}
      students={studentFolders.data}
      usage={usage.data}
      openingStudentId={ensureStudent.isPending ? (ensureStudent.variables ?? null) : null}
      onSection={goSection}
      onFolder={goFolder}
      onStudent={openStudent}
      // The sidebar's "+" sits under "Folders", which is always the caller's own library.
      onCreateFolder={() => setFolderDialog({ mode: "create", parentId: !isShared && currentFolder && !filtering ? currentFolder.id : null, scope: "PERSONAL" })}
      onDropFiles={dropFilesOn}
    />
  );

  const isEmptyHere = !files.isPending && fileList.length === 0 && visibleFolders.length === 0;

  return (
    <div className="space-y-5">
      {/* ── page header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        {canManageHere && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={newFolderHere}>
              <FolderPlusIcon /> {t("library.header.newFolder")}
            </Button>
            <Button onClick={() => fileInput.current?.click()} disabled={!uploadTarget}>
              <CloudUploadIcon /> {t("library.header.uploadFiles")}
            </Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => {
                startUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* ── sidebar ── */}
        <aside className="sticky top-24 hidden self-start max-h-[calc(100dvh-7.5rem)] w-64 shrink-0 overflow-y-auto rounded-3xl border bg-card p-3 lg:block">
          {sidebar}
        </aside>

        {/* ── main ── */}
        <section
          className="relative min-w-0 flex-1 space-y-4"
          aria-label={t("library.toolbar.content")}
          onDragEnter={(e) => {
            if (!uploadTarget || !isFileDrag(e)) return;
            dragDepth.current++;
            setDragging(true);
          }}
          onDragOver={(e) => {
            if (uploadTarget && isFileDrag(e)) e.preventDefault();
          }}
          onDragLeave={(e) => {
            if (!isFileDrag(e)) return;
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (!dragDepth.current) setDragging(false);
          }}
          onDrop={(e) => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            startUpload(e.dataTransfer.files);
          }}
        >
          {/* toolbar: location + search */}
          <div className="flex flex-wrap items-center gap-3">
            <Sheet open={mobileNav} onOpenChange={setMobileNav}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label={t("library.toolbar.navigation")}>
                  <FolderClosedIcon />
                </Button>
              </SheetTrigger>
              <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-80 overflow-y-auto p-4">
                <SheetTitle className="mb-3">{title}</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>

            <Breadcrumb className="min-w-0 flex-1">
              <BreadcrumbList className="flex-nowrap">
                {searching ? (
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate text-lg font-bold">{t("library.toolbar.searchResults")}</BreadcrumbPage>
                  </BreadcrumbItem>
                ) : crumbs.length ? (
                  <>
                    <BreadcrumbItem className="hidden sm:inline-flex">
                      <BreadcrumbLink asChild>
                        <button type="button" onClick={() => goSection(rootSection)}>
                          {sectionLabel[rootSection]}
                        </button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {crumbs.map((c, i) => (
                      <span key={c.id} className={cn("contents", i < crumbs.length - 2 && "max-sm:hidden")}>
                        <BreadcrumbSeparator className={cn(i === 0 && "max-sm:hidden")} />
                        <BreadcrumbItem className="min-w-0">
                          {i === crumbs.length - 1 ? (
                            <BreadcrumbPage className="truncate text-lg font-bold"><bdi>{c.name}</bdi></BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <button type="button" className="max-w-40 truncate" onClick={() => goFolder(c.id)}>
                                <bdi>{c.name}</bdi>
                              </button>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </span>
                    ))}
                  </>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-lg font-bold">{sectionLabel[loc.section]}</BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={
                  isStudent
                    ? t("library.toolbar.searchPlaceholderStudent")
                    : isShared
                      ? t("library.shared.searchPlaceholder")
                      : t("library.toolbar.searchPlaceholder")
                }
                aria-label={t("common.actions.search")}
                className="rounded-full ps-10 pe-9"
              />
              {searchText && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute end-2 top-1/2 -translate-y-1/2"
                  aria-label={t("library.toolbar.clearSearch")}
                  onClick={() => setSearchText("")}
                >
                  <XIcon />
                </Button>
              )}
            </div>
          </div>

          {/* student-folder notice */}
          {canEdit && currentFolder?.studentId && (
            <Alert className="border-info/30 bg-info/8">
              <EyeIcon className="text-info" />
              <AlertDescription className="text-foreground">
                {rich("library.students.notice", {
                  name: <strong>{t("library.quoted", { name: currentFolder.studentName ?? "" })}</strong>,
                })}
              </AlertDescription>
            </Alert>
          )}

          {/* center library: who can do what here */}
          {isShared && usage.data && (
            <Alert className="border-info/30 bg-info/8">
              {canManageShared ? <Building2Icon className="text-info" /> : <LockIcon className="text-info" />}
              <AlertDescription className="text-foreground">
                {canManageShared ? t("library.shared.manageHint") : t("library.shared.readOnlyHint")}
              </AlertDescription>
            </Alert>
          )}

          {showStudentsOverview ? (
            <StudentsOverview students={studentFolders.data} loading={studentFolders.isPending} opening={ensureStudent.isPending ? ensureStudent.variables : undefined} onOpen={openStudent} />
          ) : (
            <>
              {/* filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="-mx-1 flex w-full min-w-0 gap-1.5 sm:w-auto sm:flex-1 overflow-x-auto px-1 pb-1 scrollbar-none" role="group" aria-label={t("library.filters.kind")}>
                  <FilterChip active={!loc.kind} onClick={() => loc.update({ kind: null }, "replace")} count={facetTotal || undefined}>
                    {t("common.labels.all")}
                  </FilterChip>
                  {KIND_ORDER.filter((k) => facets[k] || loc.kind === k).map((k) => {
                    const Icon = KIND_META[k].icon;
                    return (
                      <FilterChip key={k} active={loc.kind === k} onClick={() => loc.update({ kind: loc.kind === k ? null : k }, "replace")} count={facets[k]}>
                        <Icon className="size-3.5" aria-hidden="true" />
                        {t(`library.kinds.${k}.plural`)}
                      </FilterChip>
                    );
                  })}
                </div>

                <Select value={loc.category ?? "ALL"} onValueChange={(v) => loc.update({ cat: v === "ALL" ? null : v }, "replace")}>
                  <SelectTrigger size="sm" className="w-auto min-w-36 rounded-full" aria-label={t("library.filters.category")}>
                    <TagIcon className="size-3.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("library.filters.allCategories")}</SelectItem>
                    {CATEGORY_ORDER.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`library.categories.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {loc.section !== "recent" || loc.folderId || searching ? (
                  <Select value={loc.sortKey} onValueChange={(v) => loc.update({ sort: v === "newest" ? null : v }, "replace")}>
                    <SelectTrigger size="sm" className="w-auto min-w-32 rounded-full" aria-label={t("library.sort.label")}>
                      <ArrowDownUpIcon className="size-3.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SORTS) as SortKey[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`library.sort.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={view}
                  onValueChange={(v) => v && setView(v as "grid" | "list")}
                  aria-label={t("library.toolbar.view")}
                >
                  <ToggleGroupItem value="grid" aria-label={t("library.toolbar.grid")}>
                    <LayoutGridIcon />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label={t("library.toolbar.list")}>
                    <ListIcon />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {files.isError && (
                <Alert variant="destructive">
                  <AlertDescription>{getErrorMessage(files.error, t("library.list.loadFailed"))}</AlertDescription>
                </Alert>
              )}

              {/* folders */}
              {visibleFolders.length > 0 && (
                <div>
                  <h2 className="mb-2.5 text-sm font-bold text-muted-foreground">{t("library.list.folders")}</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {visibleFolders.map((f) => (
                      <FolderCard
                        key={f.id}
                        folder={f}
                        actions={folderActions(f)}
                        onOpen={() => goFolder(f.id)}
                        canDrop={canManageHere}
                        onDropFiles={(ids) => dropFilesOn(f.id, ids)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* files */}
              {files.isPending ? (
                <FilesSkeleton view={view} />
              ) : isEmptyHere ? (
                <EmptyView
                  filtering={filtering}
                  isStudent={isStudent}
                  section={loc.section}
                  inFolder={Boolean(loc.folderId)}
                  canUpload={Boolean(uploadTarget)}
                  onUpload={() => fileInput.current?.click()}
                  onClear={() => {
                    setSearchText("");
                    loc.update({ q: null, kind: null, cat: null }, "replace");
                  }}
                />
              ) : fileList.length > 0 ? (
                <div className={cn("transition-opacity", files.isPlaceholderData && "opacity-60")}>
                  {visibleFolders.length > 0 && (
                    <h2 className="mb-2.5 text-sm font-bold text-muted-foreground">
                      {t("library.list.files")} {firstPage ? <span className="font-normal">({firstPage.total})</span> : null}
                    </h2>
                  )}
                  {view === "grid" ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
                      {fileList.map((f, i) => (
                        <FileCard key={f.id} {...itemProps(f, i)} />
                      ))}
                    </div>
                  ) : (
                    <FileListView
                      items={fileList.map(itemProps)}
                      selectable={canEdit}
                      showFolder={showFolder}
                      allSelected={fileList.length > 0 && fileList.every((f) => selected.has(f.id))}
                      onSelectAll={(on) => setSelected(on ? new Set(fileList.map((f) => f.id)) : new Set())}
                    />
                  )}
                  <div ref={sentinel} className="flex justify-center py-4">
                    {isFetchingNextPage && <Loader2Icon className="size-5 animate-spin text-muted-foreground" />}
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* drop overlay */}
          {dragging && uploadTarget && (
            <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-3xl border-2 border-dashed border-primary bg-primary/8 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-3 rounded-3xl bg-background/95 px-8 py-6 text-center shadow-soft">
                <CloudUploadIcon className="size-10 text-primary" />
                <p className="font-bold">{t("library.upload.dropTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("library.upload.dropTarget", { name: uploadTarget.folderName })}</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── selection bar ── */}
      {canEdit && selected.size > 0 && (
        <div
          role="toolbar"
          aria-label={t("library.selection.toolbar")}
          className="fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border bg-popover p-1.5 shadow-2xl"
        >
          <Button variant="ghost" size="icon-sm" aria-label={t("library.selection.clear")} onClick={clearSelection}>
            <XIcon />
          </Button>
          <span className="px-2 text-sm font-semibold whitespace-nowrap">{t("library.selection.count", { count: selected.size })}</span>
          <Button size="sm" onClick={() => setSendIds(selectedIds)}>
            <SendIcon /> <span className="max-sm:hidden">{t("library.selection.send")}</span>
          </Button>
          {isShared && (
            <Button size="sm" variant="ghost" onClick={() => setImportIds(selectedIds)}>
              <CopyPlusIcon /> <span className="max-sm:hidden">{t("library.shared.addToMine")}</span>
            </Button>
          )}
          {canManageHere && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setMove({ kind: "files", ids: selectedIds, currentId: loc.folderId })}>
                <FolderInputIcon /> <span className="max-sm:hidden">{t("library.selection.move")}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <TagIcon /> <span className="max-sm:hidden">{t("library.selection.category")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top">
                  <DropdownMenuLabel>{t("library.selection.changeCategory", { count: selected.size })}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {CATEGORY_ORDER.map((c) => (
                    <DropdownMenuItem
                      key={c}
                      onSelect={() => selectedIds.forEach((id) => updateFile.mutate({ id, category: c }))}
                    >
                      {t(`library.categories.${c}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            aria-label={t("common.actions.download")}
            onClick={() => fileList.filter((f) => selected.has(f.id)).forEach((f, i) => setTimeout(() => downloadFile(f.downloadUrl), i * 400))}
          >
            <DownloadIcon />
          </Button>
          {canManageHere && (
            <Button
              size="sm"
              variant="destructive-soft"
              aria-label={t("common.actions.delete")}
              onClick={() => setConfirm({ kind: "files", ids: selectedIds })}
            >
              <Trash2Icon />
            </Button>
          )}
        </div>
      )}

      {/* ── overlays ── */}
      <FilePreview
        files={fileList}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        canEdit={canEdit}
        canStar={canEdit && !isShared}
        isStudent={isStudent}
        actions={(f) => fileActions(f, true)}
        onToggleStar={toggleStar}
      />

      {folderDialog && (
        <FolderDialog
          key={folderDialog.mode === "edit" ? folderDialog.folder.id : `new-${folderDialog.parentId}`}
          open
          onOpenChange={(o) => !o && setFolderDialog(null)}
          initial={folderDialog.mode === "edit" ? folderDialog.folder : null}
          parentName={
            folderDialog.mode === "create" && folderDialog.parentId
              ? (folderDialog.scope === "SHARED" ? sharedFolders : folders).data?.find((f) => f.id === folderDialog.parentId)?.name
              : undefined
          }
          pending={createFolder.isPending || updateFolder.isPending}
          onSubmit={(v) => {
            const done = { onSuccess: () => setFolderDialog(null) };
            if (folderDialog.mode === "create") createFolder.mutate({ ...v, parentId: folderDialog.parentId, scope: folderDialog.scope }, done);
            else updateFolder.mutate({ id: folderDialog.folder.id, color: v.color, name: folderDialog.folder.isStudentRoot ? undefined : v.name }, done);
          }}
        />
      )}

      {editFile && (
        <FileEditDialog
          key={editFile.id}
          file={editFile}
          onOpenChange={(o) => !o && setEditFile(null)}
          pending={updateFile.isPending}
          onSubmit={(v) => updateFile.mutate({ id: editFile.id, ...v }, { onSuccess: () => setEditFile(null) })}
        />
      )}

      {move && scopeFolders.data && (
        <MoveDialog
          open
          onOpenChange={(o) => !o && setMove(null)}
          title={
            move.kind === "folder"
              ? t("library.dialogs.move.folderTitle", { name: move.folder.name })
              : t("library.dialogs.move.filesTitle", { count: move.ids.length })
          }
          folders={scopeFolders.data}
          root={isShared ? { label: t("library.sidebar.shared"), icon: Building2Icon } : undefined}
          description={isShared ? t("library.shared.moveDescription") : undefined}
          disabledIds={move.kind === "folder" ? descendantIds(move.folder.id, scopeFolders.data) : undefined}
          currentId={move.kind === "folder" ? move.folder.parentId : move.currentId}
          pending={moveFiles.isPending || updateFolder.isPending}
          onConfirm={(target) => {
            if (move.kind === "folder") updateFolder.mutate({ id: move.folder.id, parentId: target }, { onSuccess: () => setMove(null) });
            else
              moveFiles.mutate(
                { ids: move.ids, folderId: target },
                {
                  onSuccess: () => {
                    setMove(null);
                    clearSelection();
                  },
                },
              );
          }}
        />
      )}

      {importIds && folders.data && (
        <MoveDialog
          open
          onOpenChange={(o) => !o && setImportIds(null)}
          title={t("library.shared.import.title", { count: importIds.length })}
          description={t("library.shared.import.description")}
          confirmLabel={t("library.shared.import.confirm")}
          // Copies land in the teacher's own folders; student folders get files through "Send to students".
          folders={folders.data.filter((f) => !f.studentId)}
          currentId={null}
          allowCurrent
          pending={importFiles.isPending}
          onConfirm={(target) =>
            importFiles.mutate(
              { ids: importIds, folderId: target },
              {
                onSuccess: () => {
                  setImportIds(null);
                  clearSelection();
                },
              },
            )
          }
        />
      )}

      {sendIds && (
        <SendDialog
          open
          onOpenChange={(o) => !o && setSendIds(null)}
          count={sendIds.length}
          students={studentFolders.data}
          loading={studentFolders.isPending}
          pending={sendFiles.isPending}
          onConfirm={(studentIds) =>
            sendFiles.mutate(
              { ids: sendIds, studentIds },
              {
                onSuccess: () => {
                  setSendIds(null);
                  clearSelection();
                },
              },
            )
          }
        />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirm.kind === "folder" ? t("library.dialogs.confirm.deleteFolderTitle") : t("library.dialogs.confirm.deleteTitle")}
          description={
            confirm.kind === "folder"
              ? confirm.folder.isStudentRoot
                ? t("library.dialogs.confirm.deleteStudentFolder", { name: confirm.folder.name })
                : t("library.dialogs.confirm.deleteFolder", { name: confirm.folder.name })
              : confirm.name !== undefined
                ? t(isShared ? "library.shared.confirm.deleteFile" : "library.dialogs.confirm.deleteFile", { name: confirm.name })
                : t(isShared ? "library.shared.confirm.deleteFiles" : "library.dialogs.confirm.deleteFiles", { count: confirm.ids.length })
          }
          pending={deleteFiles.isPending || deleteFolder.isPending}
          onConfirm={() => {
            if (confirm.kind === "folder") {
              const folder = confirm.folder;
              deleteFolder.mutate(folder.id, {
                onSuccess: () => {
                  setConfirm(null);
                  // Deleting the open folder (or one above it) moves up to its parent.
                  if (loc.folderId && crumbs.some((c) => c.id === folder.id)) {
                    if (folder.parentId) goFolder(folder.parentId);
                    else goSection(isShared ? "shared" : folder.studentId ? "students" : "home");
                  }
                },
              });
            } else {
              deleteFiles.mutate(confirm.ids, {
                onSuccess: () => {
                  setConfirm(null);
                  clearSelection();
                },
              });
            }
          }}
        />
      )}

      {canEdit && <UploadPanel />}
    </div>
  );
}

/* ───────── pieces ───────── */

function EmptyView({
  filtering,
  isStudent,
  section,
  inFolder,
  canUpload,
  onUpload,
  onClear,
}: {
  filtering: boolean;
  isStudent: boolean;
  section: Section;
  inFolder: boolean;
  canUpload: boolean;
  onUpload: () => void;
  onClear: () => void;
}) {
  const t = useT();
  if (filtering) {
    return (
      <EmptyState icon={SearchXIcon} title={t("library.empty.noResults")} text={t("library.empty.noResultsHint")}>
        <Button variant="outline" onClick={onClear}>
          {t("library.empty.clearFilters")}
        </Button>
      </EmptyState>
    );
  }
  if (isStudent) {
    return <EmptyState
        icon={FolderClosedIcon}
        title={inFolder ? t("library.empty.folderEmpty") : t("library.empty.noFilesYet")}
        text={t("library.empty.studentHint")}
      />;
  }
  if (section === "starred" && !inFolder) {
    return <EmptyState icon={StarIcon} title={t("library.empty.noStarred")} text={t("library.empty.noStarredHint")} />;
  }
  if (section === "shared") {
    return (
      <EmptyState
        icon={Building2Icon}
        title={inFolder ? t("library.empty.folderEmpty") : t("library.shared.emptyTitle")}
        text={!canUpload ? t("library.shared.emptyHint") : inFolder ? t("library.empty.folderHint") : t("library.shared.emptyHintManage")}
      >
        {canUpload && (
          <Button onClick={onUpload}>
            <CloudUploadIcon /> {t("library.header.uploadFiles")}
          </Button>
        )}
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon={CloudUploadIcon}
      title={inFolder ? t("library.empty.folderEmpty") : t("library.empty.ready")}
      text={inFolder ? t("library.empty.folderHint") : t("library.empty.readyHint")}
    >
      {canUpload && (
        <Button onClick={onUpload}>
          <CloudUploadIcon /> {t("library.header.uploadFiles")}
        </Button>
      )}
      <p className="w-full text-xs text-muted-foreground">{t("library.empty.formats")}</p>
    </EmptyState>
  );
}

function StudentsOverview({
  students,
  loading,
  opening,
  onOpen,
}: {
  students: StudentFolder[] | undefined;
  loading: boolean;
  opening?: string;
  onOpen: (s: StudentFolder) => void;
}) {
  const t = useT();
  if (loading) return <FilesSkeleton view="list" />;
  if (!students?.length) {
    return (
      <EmptyState
        icon={UsersRoundIcon}
        title={t("library.students.none")}
        text={t("library.students.noneHint")}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {students.map((s) => (
        <button
          key={s.studentId}
          type="button"
          onClick={() => onOpen(s)}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-start transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Avatar className="size-11">
            <AvatarFallback className="bg-accent font-bold text-accent-foreground">{initials(s.fullName)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold"><bdi>{s.fullName}</bdi></span>
            <span className="block truncate text-xs text-muted-foreground">
              {[s.grade, s.folderId ? t("library.count.files", { count: s.files }) : t("library.students.noFolderYet")].filter(Boolean).join(" · ")}
            </span>
          </span>
          {opening === s.studentId && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
        </button>
      ))}
    </div>
  );
}
