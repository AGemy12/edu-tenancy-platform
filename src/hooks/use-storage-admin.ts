"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import type { Plan, StorageMember, StorageOverview, StoredBlobRow } from "@/lib/types";
import { libraryKeys } from "./use-library";

/** "Largest files" filter: everything, the center library, or one member's files. */
export type BlobFilter = { userId?: string; shared?: boolean };

export const storageKeys = {
  // Under "library" so every library mutation (uploads, deletes…) refreshes the monitor too.
  overview: ["library", "admin", "overview"] as const,
  blobs: (filter: BlobFilter) => ["library", "admin", "blobs", filter] as const,
  plans: ["plans"] as const,
};

const BLOBS_PAGE_SIZE = 20;

export function useStorageOverview(enabled = true) {
  return useQuery({
    queryKey: storageKeys.overview,
    queryFn: async () => (await api.get<StorageOverview>("/library/admin/overview")).data,
    enabled,
  });
}

export function useStoredBlobs(filter: BlobFilter, enabled = true) {
  return useInfiniteQuery({
    queryKey: storageKeys.blobs(filter),
    queryFn: async ({ pageParam }) =>
      (
        await api.get<{ data: StoredBlobRow[]; total: number; page: number; pageSize: number }>("/library/admin/blobs", {
          params: { ...filter, page: pageParam, pageSize: BLOBS_PAGE_SIZE },
        })
      ).data,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function usePlans(enabled = true) {
  return useQuery({
    queryKey: storageKeys.plans,
    queryFn: async () => (await api.get<Plan[]>("/plans")).data,
    enabled,
    staleTime: 10 * 60_000,
  });
}

/** `storageQuotaMb: null` resets the member to the package default. */
export function useUpdateStorageMember() {
  const t = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...body }: { userId: string; storageQuotaMb?: number | null; canManageShared?: boolean }) =>
      (await api.patch<StorageMember>(`/library/admin/members/${userId}`, body)).data,
    onSuccess: (_out, vars) => {
      toast.success(vars.canManageShared === undefined ? t("library.storage.toast.quotaSaved") : t("library.storage.toast.permissionSaved"));
      return qc.invalidateQueries({ queryKey: libraryKeys.all });
    },
    onError: (err) => toast.error(getErrorMessage(err, t("library.storage.toast.updateFailed"))),
  });
}

/** Deletes a stored file and every copy of it (students' copies too). */
export function useDeleteStoredBlob() {
  const t = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/library/admin/blobs/${id}`),
    onSuccess: () => {
      toast.success(t("library.storage.toast.blobDeleted"));
      return qc.invalidateQueries({ queryKey: libraryKeys.all });
    },
    onError: (err) => toast.error(getErrorMessage(err, t("library.storage.toast.blobDeleteFailed"))),
  });
}
