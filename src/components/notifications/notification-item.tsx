"use client";

import { useState } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDismissNotification, useMarkNotificationsRead } from "@/hooks/use-notifications";
import type { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NotificationIcon, isolate, useNotificationText } from "./notification-text";

/**
 * One notification. Opening it marks it read and goes where it points; an announcement opens in
 * full instead. `readOnly` (support mode) shows it without touching its state.
 */
export function NotificationItem({
  notification: n,
  readOnly = false,
  compact = false,
  onNavigate,
}: {
  notification: AppNotification;
  readOnly?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { t, format } = useI18n();
  const router = useRouter();
  const text = useNotificationText()(n);
  const markRead = useMarkNotificationsRead();
  const dismiss = useDismissNotification();
  const [reading, setReading] = useState(false);
  const unread = !n.readAt;
  // A translated sentence takes the page's direction (its names are isolated inside it);
  // only an announcement, written by a person, is user text as a whole.
  const User = n.type === "ANNOUNCEMENT" ? "bdi" : "span";

  const open = () => {
    if (unread && !readOnly) markRead.mutate([n.id]);
    if (n.type === "ANNOUNCEMENT" || !n.link) {
      setReading(true);
      return;
    }
    onNavigate?.();
    router.push(n.link);
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/60",
          unread && "bg-primary/[0.04] dark:bg-primary/[0.07]",
        )}
      >
        <NotificationIcon notification={n} />
        <button type="button" onClick={open} className="min-w-0 flex-1 text-start outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
          {text.source && <span className="block text-xs font-medium text-primary">{text.source}</span>}
          <span className={cn("block text-sm leading-snug", unread ? "font-semibold" : "font-medium text-foreground/90")}>
            <User>{text.title}</User>
          </span>
          {text.body && (
            <span className={cn("mt-0.5 block text-sm text-muted-foreground", compact ? "line-clamp-2" : "line-clamp-3")}>
              <User>{text.body}</User>
            </span>
          )}
          {text.reason && !compact && <span className="mt-1 block text-xs text-muted-foreground">{text.reason}</span>}
          {text.byline && <span className="mt-0.5 block text-xs text-muted-foreground">{text.byline}</span>}
          <time dateTime={n.createdAt} title={format.longDateTime(n.createdAt)} className="mt-1 block text-xs text-muted-foreground/80">
            {format.relative(n.createdAt)}
          </time>
        </button>
        {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label={t("notifications.markRead")} />}
        {!readOnly && (
          // Above the stretched link, visible on hover or keyboard focus.
          <div className="absolute end-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            {unread && (
              <Button variant="outline" size="icon-xs" onClick={() => markRead.mutate([n.id])} aria-label={t("notifications.markRead")} title={t("notifications.markRead")}>
                <CheckIcon />
              </Button>
            )}
            <Button variant="outline" size="icon-xs" onClick={() => dismiss.mutate(n.id)} aria-label={t("notifications.dismiss")} title={t("notifications.dismiss")}>
              <XIcon />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={reading} onOpenChange={setReading}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            {text.source && <p className="text-xs font-medium text-primary">{text.source}</p>}
            <DialogTitle>
              <User>{text.title}</User>
            </DialogTitle>
            <DialogDescription>
              {n.actor && <>{t("notifications.from", { name: isolate(n.actor.fullName) })} · </>}
              {format.longDateTime(n.createdAt)}
            </DialogDescription>
          </DialogHeader>
          <p className="whitespace-pre-line text-sm leading-relaxed">
            <User>{text.body}</User>
          </p>
          {text.reason && <p className="text-sm text-muted-foreground">{text.reason}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Splits notifications into today, yesterday and earlier, keeping their order. */
export function groupByDay(items: AppNotification[], now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const yesterday = new Date(start.getTime() - 86_400_000);
  const groups: { key: "today" | "yesterday" | "earlier"; items: AppNotification[] }[] = [];
  for (const n of items) {
    const at = new Date(n.createdAt);
    const key = at >= start ? "today" : at >= yesterday ? "yesterday" : "earlier";
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(n);
    else groups.push({ key, items: [n] });
  }
  return groups;
}
