"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useT } from "@/i18n/provider";
import type { IntegrationStatus, MonthlyReport, TenantMe, TenantStats } from "@/lib/types";

/** Query key for a list endpoint such as "/teachers". */
export const listKey = (endpoint: string) => ["list", endpoint] as const;

export function useList<T>(endpoint: string, enabled = true) {
  return useQuery({
    queryKey: listKey(endpoint),
    queryFn: async () => {
      const { data } = await api.get<T[] | { data: T[] }>(endpoint);
      return Array.isArray(data) ? data : data.data;
    },
    enabled,
  });
}

export function useCreate<TInput, TOut = unknown>(endpoint: string, opts?: { successMessage?: string }) {
  const qc = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: async (body: TInput) => (await api.post<TOut>(endpoint, body)).data,
    onSuccess: () => {
      toast.success(opts?.successMessage ?? t("common.toast.saved"));
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.saveFailed"))),
  });
}

export function useUpdate<TInput, TOut = unknown>(endpoint: string, opts?: { successMessage?: string }) {
  const qc = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: TInput }) =>
      (await api.patch<TOut>(`${endpoint}/${id}`, body)).data,
    onSuccess: () => {
      toast.success(opts?.successMessage ?? t("common.toast.updated"));
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.updateFailed"))),
  });
}

/** POST to a sub-route of a row, e.g. /sessions/:id/cancel. */
export function useRowAction(endpoint: string, action: string, opts?: { successMessage?: string }) {
  const qc = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body?: unknown }) =>
      (await api.post(`${endpoint}/${id}/${action}`, body ?? {})).data,
    onSuccess: () => {
      toast.success(opts?.successMessage ?? t("common.toast.done"));
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.actionFailed"))),
  });
}

export function useRemove(endpoint: string) {
  const qc = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      toast.success(t("common.toast.deleted"));
      qc.invalidateQueries({ queryKey: ["list"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.deleteFailed"))),
  });
}

/** The center and its subscription (any tenant user may call it; not the platform super admin). */
export function useTenantMe(enabled = true) {
  return useQuery({
    queryKey: ["tenant", "me"],
    queryFn: async () => (await api.get<TenantMe>("/tenants/me")).data,
    enabled,
    staleTime: 10 * 60_000,
  });
}

export function useStats(enabled = true) {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => (await api.get<TenantStats>("/tenants/me/stats")).data,
    enabled,
  });
}

export function useMonthlyReport(month: string) {
  return useQuery({
    queryKey: ["reports", "monthly", month],
    queryFn: async () => (await api.get<MonthlyReport[]>("/reports/monthly", { params: { month } })).data,
    placeholderData: (prev) => prev,
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: async () => (await api.get<IntegrationStatus>("/integrations")).data,
  });
}
