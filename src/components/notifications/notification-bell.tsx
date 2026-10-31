"use client";

import { useState } from "react";
import { BellIcon, CheckCheckIcon, SettingsIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkAllNotificationsRead, useNotifications, useUnreadNotifications } from "@/hooks/use-notifications";
import type { AuthUser } from "@/lib/types";
import { NotificationItem } from "./notification-item";

/** The bell in the header: unread count, and the latest notifications a click away. */
export function NotificationBell({ user }: { user: AuthUser }) {
  const { t, format } = useI18n();
  const [open, setOpen] = useState(false);
  const unread = useUnreadNotifications().data ?? 0;
  // Loaded once opened; live events keep it current afterwards.
  const list = useNotifications({}, open);
  const markAll = useMarkAllNotificationsRead();
  const items = list.data?.pages.flatMap((p) => p.items).slice(0, 8) ?? [];
  const readOnly = Boolean(user.support);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`${t("notifications.bell")} — ${t("notifications.bellUnread", { count: unread })}`}>
          {/* Rings again whenever the count goes up. */}
          <BellIcon key={unread} className={unread ? "origin-top motion-safe:animate-[bell-ring_0.9s_ease-in-out_1]" : undefined} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] font-bold leading-none text-destructive-foreground ring-2 ring-background">
              {format.number(Math.min(unread, 99))}
              {unread > 99 && "+"}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{t("notifications.title")}</p>
            <p className="text-xs text-muted-foreground">{t("notifications.bellUnread", { count: unread })}</p>
          </div>
          <div className="flex items-center gap-1">
            {!readOnly && unread > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAll.mutate(null)} disabled={markAll.isPending}>
                <CheckCheckIcon /> {t("notifications.markAllRead")}
              </Button>
            )}
            {!readOnly && (
              <Button asChild variant="ghost" size="icon-sm" aria-label={t("notifications.tabs.preferences")} title={t("notifications.tabs.preferences")}>
                <Link href="/dashboard/notifications?tab=preferences" onClick={() => setOpen(false)}>
                  <SettingsIcon />
                </Link>
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-1.5">
          {list.isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <BellIcon className="size-5" />
              </span>
              <p className="text-sm font-semibold">{t("notifications.empty")}</p>
              <p className="text-xs text-muted-foreground">{t("notifications.emptyHint")}</p>
            </div>
          ) : (
            items.map((n) => <NotificationItem key={n.id} notification={n} readOnly={readOnly} compact onNavigate={() => setOpen(false)} />)
          )}
        </div>
        <div className="border-t p-1.5">
          <Button asChild variant="ghost" className="w-full">
            <Link href="/dashboard/notifications" onClick={() => setOpen(false)}>
              {t("notifications.viewAll")}
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
