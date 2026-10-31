"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { BellOffIcon, CheckCheckIcon, InboxIcon, Loader2Icon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsHeader } from "@/components/settings-section";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useMarkAllNotificationsRead,
  useNotificationPreferences,
  useNotifications,
  useUnreadNotifications,
} from "@/hooks/use-notifications";
import type { AuthUser, NotificationCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NotificationItem, groupByDay } from "./notification-item";
import { categoryIcon } from "./notification-text";
import { NotificationPreferences } from "./notification-preferences";
import { Announcements } from "./announcements";

const TABS = ["all", "unread", "preferences", "announcements"] as const;
type Tab = (typeof TABS)[number];

const canAnnounce = (user: AuthUser) => (user.role === "TENANT_ADMIN" || (user.role === "SUPER_ADMIN" && !user.tenantId)) && !user.support;

/** The notifications page: the full list with filters, the person's preferences, and (admins) announcements. */
export function NotificationsView() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const params = useSearchParams();

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const qs = next.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    },
    [params],
  );

  if (!user) return <Skeleton className="h-96 max-w-4xl rounded-2xl" />;
  const readOnly = Boolean(user.support);
  const tabs = TABS.filter((tab) => (tab === "announcements" ? canAnnounce(user) : tab === "preferences" ? !readOnly : true));
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && tabs.includes(requested) ? requested : "all";
  const category = (params.get("category") as NotificationCategory | null) || null;

  return (
    <div className="max-w-4xl space-y-6">
      <SettingsHeader title={t("notifications.title")} description={t("notifications.description")} />

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === "all" ? null : v })}>
        <TabsList className="max-w-full overflow-x-auto">
          {tabs.map((v) => (
            <TabsTrigger key={v} value={v} className="px-4">
              {t(`notifications.tabs.${v}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <NotificationList unread={false} category={category} onCategory={(c) => set({ category: c })} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="unread" className="mt-6">
          <NotificationList unread category={category} onCategory={(c) => set({ category: c })} readOnly={readOnly} />
        </TabsContent>
        {!readOnly && (
          <TabsContent value="preferences" className="mt-6">
            <NotificationPreferences />
          </TabsContent>
        )}
        {canAnnounce(user) && (
          <TabsContent value="announcements" className="mt-6">
            <Announcements platform={user.role === "SUPER_ADMIN"} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function NotificationList({
  unread,
  category,
  onCategory,
  readOnly,
}: {
  unread: boolean;
  category: NotificationCategory | null;
  onCategory: (c: string | null) => void;
  readOnly: boolean;
}) {
  const { t } = useI18n();
  const list = useNotifications({ unread, category });
  const unreadCount = useUnreadNotifications().data ?? 0;
  const markAll = useMarkAllNotificationsRead();
  // The categories this person can receive come with their preferences.
  const categories = useNotificationPreferences().data?.map((p) => p.category) ?? [];
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("notifications.allCategories")}>
            <FilterChip active={!category} onClick={() => onCategory(null)}>
              {t("notifications.allCategories")}
            </FilterChip>
            {categories.map((c) => {
              const Icon = categoryIcon(c);
              return (
                <FilterChip key={c} active={category === c} onClick={() => onCategory(category === c ? null : c)}>
                  <Icon className="size-3.5" aria-hidden="true" />
                  {t(`notifications.categories.${c}`)}
                </FilterChip>
              );
            })}
          </div>
        )}
        {!readOnly && unreadCount > 0 && (
          <Button variant="outline" size="sm" className="ms-auto" onClick={() => markAll.mutate(category)} disabled={markAll.isPending}>
            <CheckCheckIcon /> {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-2 sm:p-3">
          {list.isLoading ? (
            <div className="space-y-4 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {unread ? <InboxIcon className="size-6" /> : <BellOffIcon className="size-6" />}
              </span>
              <p className="font-semibold">{unread ? t("notifications.emptyUnread") : t("notifications.empty")}</p>
              <p className="max-w-sm text-sm text-muted-foreground">{unread ? t("notifications.emptyUnreadHint") : t("notifications.emptyHint")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupByDay(items).map((g, i) => (
                <section key={`${g.key}-${i}`} aria-labelledby={`n-group-${i}`}>
                  <h2 id={`n-group-${i}`} className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(`notifications.${g.key}`)}
                  </h2>
                  <div className="space-y-0.5">
                    {g.items.map((n) => (
                      <NotificationItem key={n.id} notification={n} readOnly={readOnly} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage && <Loader2Icon className="animate-spin" />}
            {t("notifications.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
