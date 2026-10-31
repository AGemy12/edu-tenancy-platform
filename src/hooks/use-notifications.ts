"use client";

import { type InfiniteData, type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useT } from "@/i18n/provider";
import type {
  Announcement,
  AnnouncementAudience,
  AppNotification,
  NotificationCategory,
  NotificationPage,
  NotificationPreference,
} from "@/lib/types";

export type NotificationFilter = { unread?: boolean; category?: NotificationCategory | null };

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: ["notifications", "list"] as const,
  list: (f: NotificationFilter) => ["notifications", "list", f.unread ?? false, f.category ?? null] as const,
  unread: ["notifications", "unread"] as const,
  preferences: ["notifications", "preferences"] as const,
  announcements: ["announcements"] as const,
};

/** Newest first, a page at a time. */
export function useNotifications(filter: NotificationFilter = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<NotificationPage>("/notifications", {
        params: { cursor: pageParam ?? undefined, unread: filter.unread || undefined, category: filter.category ?? undefined, take: 20 },
      });
      return data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });
}

export function useUnreadNotifications(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async () => (await api.get<{ unread: number }>("/notifications/unread-count")).data.unread,
    enabled,
    staleTime: 60_000,
  });
}

/* ── Cache updates (used by the mutations and by real-time events) ── */

type Pages = InfiniteData<NotificationPage, string | null>;

/** Applies `fn` to every notification in every cached list. */
export function patchNotifications(qc: QueryClient, fn: (n: AppNotification) => AppNotification | null) {
  qc.setQueriesData<Pages>({ queryKey: notificationKeys.lists }, (data) =>
    data
      ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map(fn).filter((n): n is AppNotification => n !== null) })) }
      : data,
  );
}

/** A new notification goes on top of every list it belongs in. */
export function prependNotification(qc: QueryClient, n: AppNotification) {
  for (const [key, data] of qc.getQueriesData<Pages>({ queryKey: notificationKeys.lists })) {
    if (!data?.pages.length) continue;
    const [, , , category] = key as ReturnType<typeof notificationKeys.list>;
    if (category && category !== n.category) continue;
    if (data.pages.some((p) => p.items.some((x) => x.id === n.id))) continue;
    const [first, ...rest] = data.pages;
    qc.setQueryData<Pages>(key, { ...data, pages: [{ ...first, items: [n, ...first.items] }, ...rest] });
  }
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => (await api.post<{ unread: number }>("/notifications/read", { ids })).data,
    onMutate: (ids) => {
      const now = new Date().toISOString();
      patchNotifications(qc, (n) => (ids.includes(n.id) && !n.readAt ? { ...n, readAt: now } : n));
    },
    onSuccess: (data) => qc.setQueryData(notificationKeys.unread, data.unread),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: async (category?: NotificationCategory | null) =>
      (await api.post<{ unread: number }>("/notifications/read-all", category ? { category } : {})).data,
    onMutate: (category) => {
      const now = new Date().toISOString();
      patchNotifications(qc, (n) => (!n.readAt && (!category || n.category === category) ? { ...n, readAt: now } : n));
    },
    onSuccess: (data) => qc.setQueryData(notificationKeys.unread, data.unread),
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.actionFailed"))),
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<{ unread: number }>(`/notifications/${id}`)).data,
    onMutate: (id) => patchNotifications(qc, (n) => (n.id === id ? null : n)),
    onSuccess: (data) => qc.setQueryData(notificationKeys.unread, data.unread),
    onError: (err) => {
      toast.error(getErrorMessage(err, t("common.toast.deleteFailed")));
      qc.invalidateQueries({ queryKey: notificationKeys.lists });
    },
  });
}

/* ── Preferences ── */

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: async () => (await api.get<NotificationPreference[]>("/notifications/preferences")).data,
  });
}

export function useSaveNotificationPreferences() {
  const qc = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: async (items: Pick<NotificationPreference, "category" | "inApp" | "email">[]) =>
      (await api.put<NotificationPreference[]>("/notifications/preferences", { items })).data,
    onSuccess: (data) => {
      qc.setQueryData(notificationKeys.preferences, data);
      toast.success(t("common.toast.saved"));
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.saveFailed"))),
  });
}

/* ── Announcements ── */

export function useAnnouncements(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.announcements,
    queryFn: async () => (await api.get<Announcement[]>("/announcements")).data,
    enabled,
  });
}

export type AnnouncementInput = { title: string; body: string; audience: AnnouncementAudience; tenantIds?: string[] };

export function useSendAnnouncement() {
  const qc = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: async (input: AnnouncementInput) => (await api.post<Announcement>("/announcements", input)).data,
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: notificationKeys.announcements });
      toast.success(t("notifications.announce.sent", { count: a.recipients }));
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.saveFailed"))),
  });
}
