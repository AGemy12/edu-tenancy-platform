"use client";

import { useMemo, useState } from "react";
import { ArchiveIcon, BellOffIcon, InboxIcon, MessageSquarePlusIcon, SearchIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useInbox } from "@/hooks/use-messages";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isolate } from "@/components/notifications/notification-text";
import { ChatAvatar, conversationName, usePresence, useShortTime, useSystemText, useTyping } from "./chat-parts";
import { useCallPreview } from "./call-parts";

export function ConversationList({
  me,
  activeId,
  onOpen,
  onNew,
}: {
  me: string;
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const { t } = useI18n();
  const [archived, setArchived] = useState(false);
  const [q, setQ] = useState("");
  const inbox = useInbox(archived);
  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase();
    const rows = inbox.data ?? [];
    return needle ? rows.filter((c) => conversationName(c, "").toLocaleLowerCase().includes(needle) || c.course?.title.toLocaleLowerCase().includes(needle)) : rows;
  }, [inbox.data, q]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="px-1 text-lg font-bold">{t("chat.title")}</h1>
          <Button size="sm" onClick={onNew}>
            <MessageSquarePlusIcon /> {t("chat.newChat")}
          </Button>
        </div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("chat.search")} aria-label={t("chat.search")} className="ps-9" />
        </div>
        <div className="flex gap-1" role="tablist">
          {[false, true].map((a) => (
            <button
              key={String(a)}
              type="button"
              role="tab"
              aria-selected={archived === a}
              onClick={() => setArchived(a)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
                archived === a ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {a ? <ArchiveIcon className="size-3.5" /> : <InboxIcon className="size-3.5" />}
              {a ? t("chat.archived") : t("chat.inbox")}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {inbox.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              {archived ? <ArchiveIcon className="size-5" /> : <InboxIcon className="size-5" />}
            </span>
            <p className="text-sm font-semibold">{q ? t("chat.noResults") : archived ? t("chat.emptyArchive") : t("chat.emptyInbox")}</p>
            {!q && !archived && <p className="text-xs text-muted-foreground">{t("chat.emptyInboxHint")}</p>}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((c) => (
              <li key={c.id}>
                <ConversationRow conversation={c} me={me} active={c.id === activeId} onOpen={() => onOpen(c.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConversationRow({ conversation: c, me, active, onOpen }: { conversation: Conversation; me: string; active: boolean; onOpen: () => void }) {
  const { t } = useI18n();
  const shortTime = useShortTime();
  const systemText = useSystemText();
  const callPreview = useCallPreview();
  const presence = usePresence(c.peer?.membershipId, c.peer ?? undefined);
  const typing = useTyping(c.id, me);
  const name = conversationName(c, t("chat.deletedMember"));
  const last = c.lastMessage;
  const unread = c.unreadCount > 0;

  // Who wrote it (in the page's language) and what they wrote (their text, isolated).
  let prefix = "";
  let preview: React.ReactNode = "";
  if (last) {
    if (last.deletedAt) preview = t("chat.deleted");
    else if (last.kind === "SYSTEM") preview = systemText(last);
    else if (last.kind === "CALL") preview = callPreview(last);
    else {
      prefix = last.senderId === me ? t("chat.youPrefix") : c.kind === "GROUP" && last.sender ? `${isolate(last.sender.fullName)}: ` : "";
      preview = <bdi>{last.body.replace(/\s+/g, " ")}</bdi>;
    }
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "bg-sidebar-accent" : "hover:bg-muted/70",
      )}
    >
      <ChatAvatar name={name} id={c.peer?.membershipId ?? c.id} group={c.kind === "GROUP"} course={Boolean(c.course)} online={c.kind === "DIRECT" && presence.online} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-sm", unread ? "font-bold" : "font-semibold")}>
            <bdi>{name}</bdi>
          </span>
          <span className={cn("shrink-0 text-[0.7rem]", unread ? "font-semibold text-primary" : "text-muted-foreground")}>{shortTime(c.lastMessageAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("truncate text-xs", typing.length ? "font-medium text-primary" : unread ? "text-foreground" : "text-muted-foreground")}>
            {typing.length ? (
              t("chat.typing")
            ) : (
              <>
                {prefix}
                {preview}
              </>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {c.muted && <BellOffIcon className="size-3.5 text-muted-foreground" aria-label={t("chat.muted")} />}
            {unread && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[0.65rem] font-bold text-primary-foreground" aria-label={t("chat.unreadCount", { count: c.unreadCount })}>
                {c.unreadCount > 99 ? "99+" : c.unreadCount}
              </span>
            )}
          </span>
        </span>
      </span>
    </button>
  );
}
