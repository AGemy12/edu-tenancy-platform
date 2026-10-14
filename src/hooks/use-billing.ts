"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BillingGroupBy, BillingOptions, BillingSessionsPage, BillingSummary } from "@/lib/types";
import { listKey } from "./use-resources";

/** Query params sent to /billing/sessions and /billing/summary (see BillingQueryDto). */
export type BillingParams = {
  from: string;
  to: string;
  teacherId?: string;
  studentId?: string;
  courseId?: string;
  provider?: string;
  status?: string;
  attendance?: string;
  entry?: string;
  missingRate?: string;
  q?: string;
};

// Keys sit under "list" so finishing or editing a session, or changing a rate, refreshes billing too.

export function useBillingSessions(params: BillingParams & { sort?: string; page?: number }) {
  return useQuery({
    queryKey: [...listKey("/billing/sessions"), params],
    queryFn: async () => (await api.get<BillingSessionsPage>("/billing/sessions", { params })).data,
    placeholderData: (prev) => prev,
  });
}

export function useBillingSummary(params: BillingParams & { groupBy: BillingGroupBy }, enabled = true) {
  return useQuery({
    queryKey: [...listKey("/billing/summary"), params],
    queryFn: async () => (await api.get<BillingSummary>("/billing/summary", { params })).data,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useBillingOptions() {
  return useQuery({
    queryKey: listKey("/billing/options"),
    queryFn: async () => (await api.get<BillingOptions>("/billing/options")).data,
    staleTime: 5 * 60_000,
  });
}
