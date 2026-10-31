"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowLeftIcon, BellOffIcon, InfoIcon, Loader2Icon, MessageCircleOffIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantMe } from "@/hooks/use-resources";
import {
  chatKeys,
  flattenMessages,
  newClientId,
  useConversation,
  useDeleteMessage,
  useEditMessage,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
} from "@/hooks/use-messages";
import { useChatStore } from "@/stores/chat-store";
import type { AuthUser, ChatMessage, Conversation, ConversationDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isolate } from "@/components/notifications/notification-text";
import { canCall, useCallState } from "@/hooks/use-calls";
import { ChatAvatar, conversationName, sameDay, usePresence, useSystemText, useTyping } from "./chat-parts";
import { MessageBubble, type Receipt, SystemLine } from "./message-bubble";
import { CallButton, CallCard } from "./call-parts";
import { Composer } from "./composer";

/** Messages closer than this (same sender) read as one run: one name, one avatar. */
const RUN_MS = 5 * 60_000;
const NEAR_BOTTOM_PX = 120;

export function ConversationThread({ id, user, onBack, onInfo }: { id: string; user: AuthUser; onBack: () => void; onInfo: () => void }) {
  const { t, format } = useI18n();
  const qc = useQueryClient();
  const me = user.membershipId!;
  const detail = useConversation(id);
  const history = useMessages(id);
  const messages = flattenMessages(history.data);
  const markRead = useMarkConversationRead();
  const send = useSendMessage(id, { membershipId: me, fullName: user.fullName, role: user.role });
  const edit = useEditMessage();
  const remove = useDeleteMessage();
  const tenant = useTenantMe(Boolean(user.tenantId));
  const systemText = useSystemText();
  const typing = useTyping(id, me);

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState<ChatMessage | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  // Where "new messages" starts: what was unread when the conversation was opened.
  const [unreadSince] = useState(() => {
    const row = qc.getQueryData<Conversation[]>(chatKeys.inbox(false))?.find((c) => c.id === id);
    return row && row.unreadCount > 0 ? (row.lastReadAt ?? "1970-01-01T00:00:00Z") : null;
  });

  const c: ConversationDetail | undefined = detail.data;
  const peerId = c?.kind === "DIRECT" ? c.peer?.membershipId : null;
  const presence = usePresence(peerId, c?.peer ?? undefined);
  // A teacher and their student can call each other while a session of theirs is on.
  const calls = canCall(user, c);
  const callState = useCallState(id, calls);

  /* ── Read state: this conversation counts as read while it is on screen ── */
  useEffect(() => {
    const store = useChatStore.getState();
    const sync = () => {
      const visible = document.visibilityState === "visible";
      store.setActive(visible ? id : null);
      if (visible) markRead.mutate(id);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      useChatStore.getState().setActive(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `mutate` is stable
  }, [id]);

  /* ── Scrolling: start at the first unread (or the end), follow new messages, keep place when loading older ── */
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const anchor = useRef<{ height: number; top: number } | null>(null);
  const placed = useRef(false);
  const firstId = messages[0]?.id;
  const lastMessage = messages[messages.length - 1];

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !anchor.current) return;
    el.scrollTop = el.scrollHeight - anchor.current.height + anchor.current.top;
    anchor.current = null;
  }, [firstId]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !lastMessage) return;
    if (!placed.current) {
      placed.current = true;
      const divider = el.querySelector<HTMLElement>("[data-unread-divider]");
      if (divider) el.scrollTop = divider.offsetTop - 24;
      else el.scrollTop = el.scrollHeight;
      return;
    }
    if (nearBottom.current || lastMessage.senderId === me) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else setShowJump(true);
  }, [lastMessage?.id, lastMessage, me]);

  const onScroll = () => {
    const el = scroller.current!;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottom.current) setShowJump(false);
    if (el.scrollTop < 120 && history.hasNextPage && !history.isFetchingNextPage) {
      anchor.current = { height: el.scrollHeight, top: el.scrollTop };
      void history.fetchNextPage();
    }
  };

  const jumpTo = (messageId: string) => {
    const target = document.getElementById(`msg-${messageId}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("animate-pulse");
    setTimeout(() => target.classList.remove("animate-pulse"), 1_600);
  };

  if (detail.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <MessageCircleOffIcon className="size-10 text-muted-foreground" aria-hidden="true" />
        <p className="font-semibold">{t("chat.conversationGone")}</p>
        <Button variant="outline" onClick={onBack}>
          {t("common.actions.back")}
        </Button>
      </div>
    );
  }

  const name = c ? conversationName(c, t("chat.deletedMember")) : "";
  const others = c?.participants.filter((p) => p.membershipId !== me) ?? [];
  const typingNames = typing.map((mid) => others.find((p) => p.membershipId === mid)?.fullName).filter(Boolean) as string[];

  let subtitle = "";
  if (typing.length) subtitle = c?.kind === "GROUP" ? (typing.length === 1 && typingNames[0] ? t("chat.typingNamed", { name: isolate(typingNames[0]) }) : t("chat.typingMany", { count: typing.length })) : t("chat.typing");
  else if (c?.kind === "DIRECT") subtitle = presence.online ? t("chat.online") : presence.lastSeenAt ? t("chat.lastSeen", { time: format.relative(presence.lastSeenAt) }) : t("chat.offline");
  else if (c) subtitle = [c.course ? t("chat.courseGroup") : null, t("chat.members", { count: c.memberCount })].filter(Boolean).join(" · ");

  const disabledReason = !c
    ? null
    : user.status === "SUSPENDED"
      ? t("chat.composer.suspended")
      : tenant.data?.subscriptionExpired
        ? t("chat.composer.expired")
        : c.kind === "GROUP" && c.adminsOnly && !c.isAdmin
          ? t("chat.composer.adminsOnly")
          : c.kind === "DIRECT" && (!c.peer || c.peer.blocked)
            ? t("chat.composer.unavailable")
            : null;

  // Receipts: in a direct chat, "seen" once the peer read past it; in a group, how many read the latest.
  const peerReadAt = c?.kind === "DIRECT" ? (others[0]?.lastReadAt ?? c.peer?.lastReadAt ?? null) : null;
  const myLast = [...messages].reverse().find((m) => m.senderId === me && m.kind === "TEXT" && !m.deletedAt);
  const receiptFor = (m: ChatMessage): Receipt => {
    if (m.senderId !== me) return null;
    if (m.pending) return { state: m.pending };
    if (c?.kind === "DIRECT") return { state: peerReadAt && peerReadAt >= m.createdAt ? "seen" : "sent" };
    const seenBy = m.id === myLast?.id ? others.filter((p) => p.lastReadAt && p.lastReadAt >= m.createdAt).length : undefined;
    return { state: "sent", seenBy };
  };

  const dividerAt = unreadSince ? messages.find((m) => m.senderId !== me && m.createdAt > unreadSince)?.id : undefined;
  // "Call back" sits on the latest call only, and only while a session of theirs is on.
  const lastCallId = [...messages].reverse().find((m) => m.kind === "CALL")?.id;
  const callable = calls && Boolean(callState.data?.session);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-3 py-2.5">
        <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={onBack} aria-label={t("common.actions.back")}>
          <ArrowLeftIcon className="rtl:rotate-180" />
        </Button>
        {c ? (
          <button type="button" onClick={onInfo} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <ChatAvatar name={name} id={c.peer?.membershipId ?? c.id} group={c.kind === "GROUP"} course={Boolean(c.course)} online={c.kind === "DIRECT" && presence.online} />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 truncate font-semibold">
                <bdi className="truncate">{name}</bdi>
                {c.muted && <BellOffIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label={t("chat.muted")} />}
              </span>
              <span className={cn("block truncate text-xs", typing.length || presence.online ? "text-primary" : "text-muted-foreground")} aria-live="polite">
                {subtitle}
              </span>
            </span>
          </button>
        ) : (
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="size-11 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        )}
        {calls && <CallButton conversationId={id} me={me} state={callState.data} disabled={Boolean(disabledReason)} now={now} />}
        <Button variant="ghost" size="icon-sm" onClick={onInfo} aria-label={t("chat.info.open")} title={t("chat.info.open")}>
          <InfoIcon />
        </Button>
      </div>

      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto bg-muted/25 px-3 py-4 md:px-6" role="log" aria-live="polite" aria-relevant="additions">
          {history.isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label={t("chat.loadOlder")} />
            </div>
          )}
          {history.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className={cn("h-12 w-2/3 rounded-2xl", i % 2 ? "ms-auto" : "")} />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
                const sameRun = (a?: ChatMessage, b?: ChatMessage) =>
                  Boolean(a && b && a.kind === "TEXT" && b.kind === "TEXT" && a.senderId === b.senderId && sameDay(a.createdAt, b.createdAt) && Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < RUN_MS);
                const startsRun = !sameRun(prev, m);
                const endsRun = !sameRun(m, next);
                return (
                  <Fragment key={m.id}>
                    {newDay && <DaySeparator iso={m.createdAt} />}
                    {m.id === dividerAt && (
                      <div data-unread-divider className="flex items-center gap-3 py-2 text-xs font-semibold text-primary">
                        <span className="h-px flex-1 bg-primary/40" />
                        {t("chat.newMessages")}
                        <span className="h-px flex-1 bg-primary/40" />
                      </div>
                    )}
                    {m.kind === "SYSTEM" ? (
                      <SystemLine>{systemText(m)}</SystemLine>
                    ) : m.kind === "CALL" ? (
                      <CallCard message={m} me={me} peerName={name} canCallBack={callable && m.id === lastCallId} disabled={Boolean(disabledReason)} now={now} />
                    ) : (
                      <div className={cn(startsRun && i > 0 && "pt-2")}>
                        <MessageBubble
                          message={m}
                          mine={m.senderId === me}
                          showSender={c?.kind === "GROUP" && startsRun}
                          showAvatar={c?.kind === "GROUP" && endsRun}
                          receipt={receiptFor(m)}
                          canModerate={c?.kind === "GROUP" && Boolean(c.isAdmin)}
                          onReply={(x) => {
                            setEditing(null);
                            setReplyTo(x);
                          }}
                          onEdit={(x) => {
                            setReplyTo(null);
                            setEditing(x);
                          }}
                          onDelete={setDeleting}
                          onRetry={(x) => send.mutate({ body: x.body, clientId: x.clientId ?? newClientId() })}
                          onJump={jumpTo}
                          now={now}
                        />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>
        {showJump && (
          <Button
            size="sm"
            variant="outline"
            className="absolute bottom-4 start-1/2 -translate-x-1/2 rounded-full shadow-md rtl:translate-x-1/2"
            onClick={() => {
              scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
              setShowJump(false);
            }}
          >
            <ArrowDownIcon /> {t("chat.jumpToLatest")}
          </Button>
        )}
      </div>

      <Composer
        key={`${id}:${editing?.id ?? ""}`}
        conversationId={id}
        disabledReason={disabledReason}
        replyTo={replyTo}
        editing={editing}
        onCancel={() => {
          setReplyTo(null);
          setEditing(null);
        }}
        onSend={(body) => {
          send.mutate({ body, clientId: newClientId(), replyTo });
          setReplyTo(null);
          nearBottom.current = true;
        }}
        onSaveEdit={(m, body) => {
          edit.mutate({ id: m.id, body });
          setEditing(null);
        }}
      />

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("chat.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("chat.deleteText")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("common.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) remove.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              {t("chat.deleteForAll")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DaySeparator({ iso }: { iso: string }) {
  const { t, format } = useI18n();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  const label = sameDay(iso, now) ? t("notifications.today") : sameDay(iso, yesterday) ? t("notifications.yesterday") : format.dayLong(iso);
  return (
    <div className="sticky top-0 z-10 flex justify-center py-2">
      <span className="rounded-full border bg-card/95 px-3 py-0.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur">{label}</span>
    </div>
  );
}
