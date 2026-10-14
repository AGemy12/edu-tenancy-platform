"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import type {
  FileCategory,
  FileKind,
  FolderColor,
  LibraryFile,
  LibraryFilesPage,
  LibraryFolder,
  LibraryScope,
  LibraryUsage,
  StudentFolder,
} from "@/lib/types";

/** Every key starts with "library", so invalidating `libraryKeys.all` refreshes all views (and the admin monitor). */
export const libraryKeys = {
  all: ["library"] as const,
  usage: ["library", "usage"] as const,
  folders: (scope: LibraryScope) => ["library", "folders", scope] as const,
  studentFolders: ["library", "student-folders"] as const,
  files: (scope: LibraryScope, params: FileQuery) => ["library", "files", scope, params] as const,
};

export type FileQuery = {
  /** folder id, "root", or undefined for the whole library */
  folderId?: string;
  q?: string;
  kind?: FileKind;
  category?: FileCategory;
  starred?: boolean;
  sort?: "createdAt" | "name" | "size";
  order?: "asc" | "desc";
};

const PAGE_SIZE = 48;

export function useLibraryUsage(enabled = true) {
  return useQuery({
    queryKey: libraryKeys.usage,
    queryFn: async () => (await api.get<LibraryUsage>("/library/usage")).data,
    enabled,
  });
}

/** PERSONAL = the caller's own folders (students get theirs whatever the scope); SHARED = the center library. */
export function useFolders(scope: LibraryScope = "PERSONAL", enabled = true) {
  return useQuery({
    queryKey: libraryKeys.folders(scope),
    queryFn: async () => (await api.get<LibraryFolder[]>("/library/folders", { params: { scope } })).data,
    enabled,
  });
}

export function useStudentFolders(enabled = true) {
  return useQuery({
    queryKey: libraryKeys.studentFolders,
    queryFn: async () => (await api.get<StudentFolder[]>("/library/student-folders")).data,
    enabled,
  });
}

export function useFiles(scope: LibraryScope, params: FileQuery, enabled = true) {
  return useInfiniteQuery({
    queryKey: libraryKeys.files(scope, params),
    queryFn: async ({ pageParam }) =>
      (await api.get<LibraryFilesPage>("/library/files", { params: { ...params, scope, page: pageParam, pageSize: PAGE_SIZE } })).data,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
    enabled,
  });
}

/** Mutation that refreshes every library view on success and toasts errors. */
function useLibraryMutation<TVars, TOut>(
  fn: (vars: TVars) => Promise<TOut>,
  opts: { success?: string | ((out: TOut, vars: TVars) => string); error: string },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (out, vars) => {
      const msg = typeof opts.success === "function" ? opts.success(out, vars) : opts.success;
      if (msg) toast.success(msg);
      return qc.invalidateQueries({ queryKey: libraryKeys.all });
    },
    onError: (err) => toast.error(getErrorMessage(err, opts.error)),
  });
}

export function useCreateFolder() {
  const t = useT();
  return useLibraryMutation(
    async (body: { name: string; parentId?: string | null; color?: FolderColor; scope: LibraryScope }) =>
      (await api.post<LibraryFolder>("/library/folders", { ...body, parentId: body.parentId ?? undefined })).data,
    { success: t("library.toast.folderCreated"), error: t("library.toast.folderCreateFailed") },
  );
}

export function useUpdateFolder() {
  const t = useT();
  return useLibraryMutation(
    async ({ id, ...body }: { id: string; name?: string; color?: FolderColor; parentId?: string | null }) =>
      (await api.patch<LibraryFolder>(`/library/folders/${id}`, body)).data,
    { success: t("library.toast.folderSaved"), error: t("library.toast.folderUpdateFailed") },
  );
}

export function useDeleteFolder() {
  const t = useT();
  return useLibraryMutation(async (id: string) => api.delete(`/library/folders/${id}`), {
    success: t("library.toast.folderDeleted"),
    error: t("library.toast.folderDeleteFailed"),
  });
}

export function useEnsureStudentFolder() {
  const t = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => (await api.post<LibraryFolder>(`/library/student-folders/${studentId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: libraryKeys.all }),
    onError: (err) => toast.error(getErrorMessage(err, t("library.toast.studentFolderFailed"))),
  });
}

export function useUpdateFile() {
  const t = useT();
  return useLibraryMutation(
    async ({ id, ...body }: { id: string; name?: string; category?: FileCategory; description?: string; starred?: boolean; folderId?: string | null }) =>
      (await api.patch<LibraryFile>(`/library/files/${id}`, body)).data,
    { error: t("library.toast.fileUpdateFailed") },
  );
}

/** All ids must be in one scope; `folderId: null` is the root of that scope. */
export function useMoveFiles() {
  const t = useT();
  return useLibraryMutation(
    async (body: { ids: string[]; folderId: string | null }) => (await api.post<{ moved: number }>("/library/files/move", body)).data,
    { success: (out) => t("library.toast.moved", { count: out.moved }), error: t("library.toast.moveFailed") },
  );
}

export function useDeleteFiles() {
  const t = useT();
  return useLibraryMutation(
    async (ids: string[]) => (await api.post<{ deleted: number }>("/library/files/delete", { ids })).data,
    { success: (out) => t("library.toast.deleted", { count: out.deleted }), error: t("library.toast.deleteFailed") },
  );
}

/** Ids may be the teacher's own files or center-library files. */
export function useSendFiles() {
  const t = useT();
  return useLibraryMutation(
    async (body: { ids: string[]; studentIds: string[] }) =>
      (await api.post<{ sent: number; skipped: number; students: number }>("/library/files/send", body)).data,
    {
      success: (out) => {
        if (out.sent === 0) return t("library.toast.alreadySent", { count: out.students });
        const sent = t("library.toast.sentTo", { count: out.students });
        return out.skipped ? `${sent} ${t("library.toast.skipped", { count: out.skipped })}` : sent;
      },
      error: t("library.toast.sendFailed"),
    },
  );
}

/** Copies center-library files into the caller's own library (no storage charged; already-added files are skipped). */
export function useImportFiles() {
  const t = useT();
  return useLibraryMutation(
    async (body: { ids: string[]; folderId: string | null }) =>
      (await api.post<{ imported: number; skipped: number }>("/library/files/import", body)).data,
    {
      success: (out) => {
        if (out.imported === 0) return t("library.toast.alreadyImported", { count: out.skipped });
        const added = t("library.toast.imported", { count: out.imported });
        return out.skipped ? `${added} ${t("library.toast.importSkipped", { count: out.skipped })}` : added;
      },
      error: t("library.toast.importFailed"),
    },
  );
}
