"use client";

import { useMemo, useState } from "react";
import {
  Building2Icon,
  ChevronDownIcon,
  ClockIcon,
  FilesIcon,
  FolderClosedIcon,
  FolderOpenIcon,
  GaugeIcon,
  HardDriveIcon,
  HouseIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { useI18n, useT } from "@/i18n/provider";
import { DRAG_MIME } from "./file-views";
import { buildTree, folderTint, formatBytes, initials, pathTo, type FolderNode } from "@/lib/library";
import type { LibraryFolder, LibraryScope, LibraryUsage, StudentFolder } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "shared" is the center library; every other section is the caller's own library. */
export type Section = "home" | "all" | "starred" | "recent" | "students" | "shared";

type Props = {
  isStudent: boolean;
  isAdmin: boolean;
  section: Section;
  folderId: string | null;
  /** Scope of the current view; files can only be dragged from it. */
  scope: LibraryScope;
  folders: LibraryFolder[] | undefined;
  sharedFolders: LibraryFolder[] | undefined;
  canManageShared: boolean;
  students: StudentFolder[] | undefined;
  usage: LibraryUsage | undefined;
  openingStudentId: string | null;
  onSection: (s: Section) => void;
  onFolder: (id: string, scope: LibraryScope) => void;
  onStudent: (s: StudentFolder) => void;
  onCreateFolder: () => void;
  /** Files dragged from the current view dropped on a folder (null = the root) of `target`. */
  onDropFiles: (folderId: string | null, ids: string[], target: LibraryScope) => void;
};

export function LibrarySidebar(p: Props) {
  const t = useT();
  const tree = useMemo(() => buildTree(p.folders ?? []), [p.folders]);
  const ownTree = tree.filter((n) => p.isStudent || !n.studentId);
  const sharedTree = useMemo(() => buildTree(p.sharedFolders ?? []), [p.sharedFolders]);
  const openPath = useMemo(() => {
    const all = [...(p.folders ?? []), ...(p.sharedFolders ?? [])];
    return new Set(p.folderId ? pathTo(p.folderId, all).map((f) => f.id) : []);
  }, [p.folderId, p.folders, p.sharedFolders]);
  const [studentQuery, setStudentQuery] = useState("");
  const students = (p.students ?? []).filter((s) => !studentQuery.trim() || s.fullName.includes(studentQuery.trim()));

  // Own files move inside the own library; center-library files dropped there are added to it (import).
  const dropOnOwn = p.isStudent ? undefined : (folderId: string | null) => (ids: string[]) => p.onDropFiles(folderId, ids, "PERSONAL");
  // Only managers reorganize the center library, and only its own files go there.
  const dropOnShared =
    p.scope === "SHARED" && p.canManageShared ? (folderId: string | null) => (ids: string[]) => p.onDropFiles(folderId, ids, "SHARED") : undefined;

  const nav: { id: Section; label: string; icon: LucideIcon }[] = p.isStudent
    ? [
        { id: "all", label: t("library.sidebar.allStudent"), icon: FilesIcon },
        { id: "recent", label: t("library.sidebar.recent"), icon: ClockIcon },
      ]
    : [
        { id: "home", label: t("library.sidebar.home"), icon: HouseIcon },
        { id: "all", label: t("library.sidebar.all"), icon: FilesIcon },
        { id: "starred", label: t("library.sidebar.starred"), icon: StarIcon },
        { id: "recent", label: t("library.sidebar.recent"), icon: ClockIcon },
      ];

  return (
    <nav className="flex h-full flex-col gap-5" aria-label={t("library.sidebar.label")}>
      <ul className="space-y-0.5">
        {nav.map((n) => (
          <li key={n.id}>
            <DropRow active={!p.folderId && p.section === n.id} onClick={() => p.onSection(n.id)} onDrop={n.id === "home" ? dropOnOwn?.(null) : undefined}>
              <n.icon className="size-4.5" aria-hidden="true" />
              <span className="flex-1">{n.label}</span>
            </DropRow>
          </li>
        ))}
      </ul>

      <div>
        <div className="mb-1.5 flex items-center justify-between px-3">
          <h2 className="text-xs font-bold text-muted-foreground">{p.isStudent ? t("library.sidebar.fromTeachers") : t("library.sidebar.folders")}</h2>
          {!p.isStudent && (
            <Button variant="ghost" size="icon-xs" aria-label={t("library.sidebar.newFolder")} onClick={p.onCreateFolder}>
              <PlusIcon />
            </Button>
          )}
        </div>
        {!p.folders ? (
          <TreeSkeleton />
        ) : ownTree.length === 0 ? (
          <p className="px-3 py-1 text-xs text-muted-foreground">{p.isStudent ? t("library.sidebar.noFoldersStudent") : t("library.sidebar.noFolders")}</p>
        ) : (
          <ul className="space-y-0.5">
            {ownTree.map((n) => (
              <TreeNode key={n.id} node={n} depth={0} openPath={openPath} activeId={p.folderId} onOpen={(id) => p.onFolder(id, "PERSONAL")} drop={dropOnOwn} />
            ))}
          </ul>
        )}
      </div>

      {!p.isStudent && (
        <ul className="space-y-0.5">
          <li>
            <DropRow active={!p.folderId && p.section === "shared"} onClick={() => p.onSection("shared")} onDrop={dropOnShared?.(null)}>
              <Building2Icon className="size-4.5" aria-hidden="true" />
              <span className="flex-1">{t("library.sidebar.shared")}</span>
              {p.usage && !p.canManageShared && (
                <LockIcon className="size-3.5 text-muted-foreground" aria-label={t("library.sidebar.readOnly")} />
              )}
            </DropRow>
          </li>
          {sharedTree.map((n) => (
            <TreeNode key={n.id} node={n} depth={1} openPath={openPath} activeId={p.folderId} onOpen={(id) => p.onFolder(id, "SHARED")} drop={dropOnShared} />
          ))}
        </ul>
      )}

      {!p.isStudent && (
        <div>
          <div className="mb-1.5 flex items-center justify-between px-3">
            <button
              type="button"
              className={cn("text-xs font-bold text-muted-foreground hover:text-foreground", p.section === "students" && !p.folderId && "text-primary")}
              onClick={() => p.onSection("students")}
            >
              {p.students ? t("library.sidebar.studentsCount", { count: p.students.length }) : t("library.sidebar.students")}
            </button>
          </div>
          {(p.students?.length ?? 0) > 6 && (
            <div className="relative mb-1.5 px-1">
              <SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder={t("library.sidebar.searchStudent")} className="h-8 ps-8 text-xs" />
            </div>
          )}
          {!p.students ? (
            <TreeSkeleton />
          ) : p.students.length === 0 ? (
            <p className="px-3 py-1 text-xs leading-relaxed text-muted-foreground">{t("library.sidebar.noStudents")}</p>
          ) : (
            <ul className="space-y-0.5">
              {students.map((s) => {
                const active = Boolean(s.folderId && p.folderId && openPath.has(s.folderId));
                return (
                  <li key={s.studentId}>
                    <DropRow
                      active={active}
                      onClick={() => p.onStudent(s)}
                      // Center-library files reach students through "Send to students", not by dragging.
                      onDrop={s.folderId && p.scope === "PERSONAL" ? dropOnOwn?.(s.folderId) : undefined}
                    >
                      <Avatar className="size-6">
                        <AvatarFallback className="bg-accent text-[0.6rem] font-bold text-accent-foreground">{initials(s.fullName)}</AvatarFallback>
                      </Avatar>
                      <span className={cn("flex-1 truncate", s.status !== "ACTIVE" && "text-muted-foreground line-through")}><bdi>{s.fullName}</bdi></span>
                      {p.openingStudentId === s.studentId ? (
                        <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        s.files > 0 && <span className="text-xs text-muted-foreground tabular-nums">{s.files}</span>
                      )}
                    </DropRow>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {p.usage && <StorageMeter usage={p.usage} scope={p.scope} isAdmin={p.isAdmin} />}
    </nav>
  );
}

/** The personal quota in personal views, the center-library quota in the shared view. */
function StorageMeter({ usage, scope, isAdmin }: { usage: LibraryUsage; scope: LibraryScope; isAdmin: boolean }) {
  const { t, rich } = useI18n();
  const shared = scope === "SHARED";
  const bucket = shared ? usage.shared : usage.personal;
  const ratio = bucket.quotaBytes > 0 ? bucket.usedBytes / bucket.quotaBytes : 1;
  const warn = ratio >= 0.9;
  const full = bucket.usedBytes >= bucket.quotaBytes;
  // Teachers who can't upload to the center library don't need the "get more space" advice.
  const canUploadHere = !shared || usage.shared.canManage;

  return (
    <div className="mt-auto space-y-2 rounded-2xl bg-muted/70 p-3.5">
      <div className="flex items-center gap-2 text-xs font-semibold">
        {shared ? <Building2Icon className="size-4 text-muted-foreground" /> : <HardDriveIcon className="size-4 text-muted-foreground" />}
        {shared ? t("library.quota.shared") : t("library.quota.personal")}
      </div>
      <Progress value={Math.min(100, ratio * 100)} className={cn("h-2", warn && "*:bg-destructive")} />
      <p className={cn("text-xs", warn ? "font-medium text-destructive" : "text-muted-foreground")}>
        {rich("library.sidebar.storageUsed", {
          used: <span dir="ltr">{formatBytes(bucket.usedBytes)}</span>,
          total: <span dir="ltr">{formatBytes(bucket.quotaBytes)}</span>,
        })}
      </p>
      {warn && (
        <p className="text-xs leading-relaxed text-destructive" role="status">
          {full ? t("library.quota.full") : t("library.quota.almostFull")}
          {canUploadHere && <> {isAdmin ? t("library.quota.upgrade") : t("library.quota.askAdmin")}</>}
        </p>
      )}
      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
        {rich("library.quota.plan", { name: <bdi>{usage.plan.name}</bdi> })} ·{" "}
        {rich("library.quota.maxFile", { max: <span dir="ltr">{formatBytes(usage.maxFileBytes)}</span> })}
      </p>
      {isAdmin && (
        <Button asChild variant="outline" size="xs" className="w-full">
          <Link href="/dashboard/library/storage">
            <GaugeIcon /> {t("library.sidebar.manageStorage")}
          </Link>
        </Button>
      )}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  openPath,
  activeId,
  onOpen,
  drop,
}: {
  node: FolderNode;
  depth: number;
  openPath: Set<string>;
  activeId: string | null;
  onOpen: (id: string) => void;
  /** Makes the row a drop target for dragged files. */
  drop?: (folderId: string) => (ids: string[]) => void;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const isOpen = expanded ?? openPath.has(node.id);
  const active = activeId === node.id;
  const Icon = active ? FolderOpenIcon : FolderClosedIcon;

  return (
    <li>
      <DropRow active={active} onClick={() => onOpen(node.id)} onDrop={drop?.(node.id)} style={{ paddingInlineStart: `${0.5 + depth * 0.9}rem` }}>
        {node.children.length > 0 ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label={isOpen ? t("library.sidebar.collapse") : t("library.sidebar.expand")}
            className="-m-1 grid size-6 place-items-center rounded-md hover:bg-background/60"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!isOpen);
            }}
          >
            <ChevronDownIcon className={cn("size-3.5 transition-transform", !isOpen && "rtl:rotate-90 ltr:-rotate-90")} />
          </span>
        ) : (
          <span className="size-4" />
        )}
        <span className={cn("grid size-6 place-items-center rounded-md", folderTint(node.color))}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span className="flex-1 truncate"><bdi>{node.name}</bdi></span>
      </DropRow>
      {isOpen && node.children.length > 0 && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} openPath={openPath} activeId={activeId} onOpen={onOpen} drop={drop} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** A sidebar row that can also receive dragged files. */
function DropRow({
  active,
  onClick,
  onDrop,
  style,
  children,
}: {
  active: boolean;
  onClick: () => void;
  onDrop?: (ids: string[]) => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={style}
      onDragOver={(e) => {
        if (!onDrop || !e.dataTransfer.types.includes(DRAG_MIME)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const raw = e.dataTransfer.getData(DRAG_MIME);
        if (!onDrop || !raw) return;
        e.preventDefault();
        e.stopPropagation();
        onDrop(JSON.parse(raw) as string[]);
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-sm transition-colors",
        active ? "bg-secondary font-semibold text-secondary-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground",
        over && "bg-primary/15 ring-2 ring-primary/50",
      )}
    >
      {children}
    </button>
  );
}

function TreeSkeleton() {
  return (
    <div className="space-y-2 px-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full rounded-lg" />
      ))}
    </div>
  );
}
