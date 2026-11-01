"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PhoneIncomingIcon, WifiOffIcon } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import { RING_MS, callKeys, endCall, joinCall } from "@/hooks/use-calls";
import { ringingKey } from "@/hooks/use-ringing";
import { chime, desktopAlert } from "@/lib/alerts";
import { connectRealtime, disconnectRealtime } from "@/lib/realtime";
import { authKeys } from "@/hooks/use-auth";
import { notificationKeys, patchNotifications, prependNotification, useUnreadNotifications } from "@/hooks/use-notifications";
import { bumpInbox, canUseMessages, chatKeys, patchInbox, upsertMessage, useChatUnread } from "@/hooks/use-messages";
import { supportAccessKey } from "@/components/settings/support-access";
import { isolate, useNotificationText } from "@/components/notifications/notification-text";
import { useChatStore } from "@/stores/chat-store";
import type { AppNotification, AuthUser, ChatMessage, Conversation, ConversationDetail } from "@/lib/types";

type Payloads = {
  "notification:new": { notification: AppNotification };
  "notification:changed": { unread: number; read?: string[]; allRead?: boolean; category?: string | null; removed?: string[] };
  "message:new": { conversationId: string; message: ChatMessage };
  "message:updated": { conversationId: string; message: ChatMessage };
  "conversation:updated": { conversationId: string };
  "conversation:read": { conversationId: string; membershipId: string; lastReadAt: string };
  "conversation:removed": { conversationId: string };
  typing: { conversationId: string; membershipId: string };
  presence: { membershipId: string; online: boolean; lastSeenAt?: string };
  "session:ring": { sessionId: string };
};

/** A dropped connection is reported only if it lasts (a token refresh reconnects in a blink). */
const OFFLINE_AFTER_MS = 4_000;

/**
 * Keeps the page live: one socket per signed-in space, its events applied to the query cache
 * (lists, badges, open conversations), and the person told (toast, desktop alert, chime, tab
 * title). After a reconnect everything shown is refetched, so nothing missed offline stays missed.
 */
export function RealtimeBridge({ user }: { user: AuthUser }) {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const describe = useNotificationText();
  const [offline, setOffline] = useState(false);
  const chat = canUseMessages(user);

  // Handlers read the latest values without re-subscribing.
  const latest = useRef({ t, describe, router, pathname, user, chat });
  useEffect(() => {
    latest.current = { t, describe, router, pathname, user, chat };
  });

  const identity = `${user.id}:${user.membershipId ?? ""}:${user.support?.sessionId ?? ""}`;

  useEffect(() => {
    const socket = connectRealtime();
    let everConnected = false;
    let offlineTimer: ReturnType<typeof setTimeout> | undefined;
    const me = () => latest.current.user.membershipId;
    const on = <K extends keyof Payloads>(event: K, fn: (p: Payloads[K]) => void) => socket.on(event as string, fn as (p: unknown) => void);

    socket.on("connect", () => {
      clearTimeout(offlineTimer);
      setOffline(false);
      // Catch up on what happened while the connection was down.
      if (everConnected) {
        qc.invalidateQueries({ queryKey: notificationKeys.all });
        qc.invalidateQueries({ queryKey: chatKeys.all });
        qc.invalidateQueries({ queryKey: ringingKey });
      }
      everConnected = true;
    });
    socket.on("disconnect", () => {
      clearTimeout(offlineTimer);
      offlineTimer = setTimeout(() => setOffline(true), OFFLINE_AFTER_MS);
    });

    /* ── Notifications ── */

    on("notification:new", ({ notification: n }) => {
      const { t, describe, router } = latest.current;
      prependNotification(qc, n);
      qc.setQueryData<number>(notificationKeys.unread, (c) => (c ?? 0) + 1);

      // What the notification changes elsewhere on screen.
      if (n.type === "ACCOUNT_STATUS") qc.invalidateQueries({ queryKey: authKeys.me });
      if (n.category === "SUBSCRIPTION") qc.invalidateQueries({ queryKey: ["tenant", "me"] });
      if (n.type === "SUPPORT_REQUESTED") qc.invalidateQueries({ queryKey: supportAccessKey });
      // Lists on screen (sessions, exams, students…) follow what just happened, for the owner too.
      if (["SESSIONS", "EXAMS", "LIBRARY", "PEOPLE", "ACTIVITY"].includes(n.category)) qc.invalidateQueries({ queryKey: ["list"] });

      const text = describe(n);
      const go = () => router.push(n.link && n.type !== "ANNOUNCEMENT" ? n.link : "/dashboard/notifications");
      toast(text.title, {
        id: `n:${n.id}`,
        description: text.source ? `${text.source} · ${text.body}`.slice(0, 160) : text.body,
        action: { label: t("common.actions.open"), onClick: go },
      });
      desktopAlert(text.title, text.body, { tag: n.id, onClick: go });
      chime();
    });

    on("notification:changed", (change) => {
      qc.setQueryData(notificationKeys.unread, change.unread);
      const now = new Date().toISOString();
      if (change.read) patchNotifications(qc, (n) => (change.read!.includes(n.id) && !n.readAt ? { ...n, readAt: now } : n));
      if (change.allRead) patchNotifications(qc, (n) => (!n.readAt && (!change.category || n.category === change.category) ? { ...n, readAt: now } : n));
      if (change.removed) patchNotifications(qc, (n) => (change.removed!.includes(n.id) ? null : n));
    });

    /* ── Sessions ── */

    // A session started, ended, or was entered elsewhere: IncomingSession rings or stops.
    on("session:ring", () => {
      qc.invalidateQueries({ queryKey: ringingKey });
      qc.invalidateQueries({ queryKey: ["list"] });
    });

    /* ── Messages ── */

    /** An incoming call: answer or decline from the toast (it lasts as long as the call rings). */
    const ring = (message: ChatMessage) => {
      const { t, router } = latest.current;
      const call = message.call!;
      const title = t("chat.call.incoming", { name: isolate(message.sender?.fullName ?? "") });
      const failed = (e: unknown) => toast.error(getErrorMessage(e, t("chat.call.failed")));
      toast(title, {
        id: `call:${call.id}`,
        description: t("chat.call.incomingHint"),
        icon: <PhoneIncomingIcon className="size-4 text-success" />,
        duration: RING_MS,
        action: { label: t("chat.call.answer"), onClick: () => void joinCall(call.id).catch(failed) },
        cancel: { label: t("chat.call.decline"), onClick: () => void endCall(call.id).catch(failed) },
      });
      desktopAlert(title, t("chat.call.incomingHint"), { tag: `call:${call.id}`, onClick: () => router.push(`/dashboard/messages?c=${message.conversationId}`) });
      chime();
    };

    on("message:new", ({ conversationId, message }) => {
      const { t, router, pathname } = latest.current;
      const mine = message.senderId === me();
      const active = useChatStore.getState().activeConversationId === conversationId && document.visibilityState === "visible";
      upsertMessage(qc, message);
      if (message.senderId) useChatStore.getState().typingStopped(conversationId, message.senderId);
      if (!bumpInbox(qc, message, { mine, read: active })) qc.invalidateQueries({ queryKey: chatKeys.inboxes });
      if (message.kind === "CALL") {
        qc.invalidateQueries({ queryKey: callKeys.state(conversationId) });
        // A call rings wherever the person is, even in a muted chat.
        if (!mine && message.call?.status === "RINGING") ring(message);
      }
      if (mine) return;

      if (active) {
        // On screen: read as it arrives (the sender sees the receipt).
        void api.post(`/conversations/${conversationId}/read`).catch(() => undefined);
        return;
      }
      qc.setQueryData<{ messages: number; conversations: number }>(chatKeys.unread, (c) => (c ? { ...c, messages: c.messages + 1 } : c));
      qc.invalidateQueries({ queryKey: chatKeys.unread });

      const row = qc.getQueryData<Conversation[]>(chatKeys.inbox(false))?.find((c) => c.id === conversationId);
      if (row?.muted || message.kind !== "TEXT") return;
      const name = isolate(message.sender?.fullName ?? "");
      const title = row?.kind === "GROUP" && row.title ? t("chat.toastIn", { name, group: isolate(row.title) }) : t("chat.toastFrom", { name });
      const go = () => router.push(`/dashboard/messages?c=${conversationId}`);
      // In the messages page the inbox already shows it; elsewhere, a toast.
      if (!pathname.startsWith("/dashboard/messages")) {
        toast(title, { id: `m:${conversationId}`, description: message.body.slice(0, 140), action: { label: t("common.actions.open"), onClick: go } });
      }
      desktopAlert(title, message.body, { tag: `c:${conversationId}`, onClick: go });
      chime();
    });

    on("message:updated", ({ conversationId, message }) => {
      upsertMessage(qc, message);
      if (message.kind === "CALL") {
        qc.invalidateQueries({ queryKey: callKeys.state(conversationId) });
        // Answered here or elsewhere, called off, or over: stop ringing.
        if (message.call?.status !== "RINGING") toast.dismiss(`call:${message.call?.id ?? ""}`);
      }
      patchInbox(qc, conversationId, (c) => (c.lastMessage?.id === message.id ? { ...c, lastMessage: { ...message, body: message.body.slice(0, 160) } } : c));
    });

    on("conversation:updated", ({ conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.inboxes });
      qc.invalidateQueries({ queryKey: chatKeys.detail(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.unread });
    });

    on("conversation:read", ({ conversationId, membershipId, lastReadAt }) => {
      if (membershipId === me()) {
        // Read on another tab or device.
        patchInbox(qc, conversationId, (c) => ({ ...c, unreadCount: 0, lastReadAt }));
        qc.invalidateQueries({ queryKey: chatKeys.unread });
        return;
      }
      patchInbox(qc, conversationId, (c) => (c.peer?.membershipId === membershipId ? { ...c, peer: { ...c.peer, lastReadAt } } : c));
      qc.setQueryData<ConversationDetail>(chatKeys.detail(conversationId), (d) =>
        d ? { ...d, participants: d.participants.map((p) => (p.membershipId === membershipId ? { ...p, lastReadAt } : p)) } : d,
      );
    });

    on("conversation:removed", ({ conversationId }) => {
      qc.setQueriesData<Conversation[]>({ queryKey: chatKeys.inboxes }, (rows) => rows?.filter((c) => c.id !== conversationId));
      qc.removeQueries({ queryKey: chatKeys.messages(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.detail(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.unread });
    });

    on("typing", ({ conversationId, membershipId }) => useChatStore.getState().typingStarted(conversationId, membershipId));
    on("presence", ({ membershipId, online, lastSeenAt }) => useChatStore.getState().setPresence(membershipId, { online, lastSeenAt }));

    return () => {
      clearTimeout(offlineTimer);
      disconnectRealtime();
      useChatStore.getState().reset();
    };
  }, [identity, qc]);

  useTabTitle(user, chat);

  if (!offline) return null;
  return (
    <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning-foreground dark:text-warning">
      <WifiOffIcon className="size-4 shrink-0" aria-hidden="true" />
      {t("notifications.offline")}
    </div>
  );
}

/** "(3) Page title" while something is unread. */
function useTabTitle(user: AuthUser, chat: boolean) {
  const notifications = useUnreadNotifications().data ?? 0;
  const messages = useChatUnread(chat).data?.messages ?? 0;
  const count = notifications + (chat ? messages : 0);
  const pathname = usePathname();

  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\+?\)\s/, "");
      const next = count > 0 ? `(${count > 99 ? "99+" : count}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    // The page sets its own title on navigation: put the count back in front.
    const titleEl = document.querySelector("title");
    const observer = titleEl ? new MutationObserver(apply) : null;
    if (titleEl) observer!.observe(titleEl, { childList: true });
    return () => {
      observer?.disconnect();
      document.title = document.title.replace(/^\(\d+\+?\)\s/, "");
    };
  }, [count, pathname, user.id]);
}
