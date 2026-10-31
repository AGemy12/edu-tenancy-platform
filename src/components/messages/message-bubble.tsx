"use client";

import { AlertCircleIcon, CheckCheckIcon, CheckIcon, ClockIcon, CopyIcon, EllipsisVerticalIcon, PencilIcon, ReplyIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChatAvatar, Linkified } from "./chat-parts";

/** 15 minutes, as on the server. */
export const EDIT_WINDOW_MS = 15 * 60_000;

export type Receipt = { state: "sending" | "failed" | "sent" | "seen"; seenBy?: number } | null;

export function MessageBubble({
  message: m,
  mine,
  showSender,
  showAvatar,
  receipt,
  canModerate,
  onReply,
  onEdit,
  onDelete,
  onRetry,
  onJump,
  now,
}: {
  message: ChatMessage;
  mine: boolean;
  /** Group chats: the sender's name above their first message in a run. */
  showSender: boolean;
  showAvatar: boolean;
  receipt: Receipt;
  /** A group admin may delete others' messages. */
  canModerate: boolean;
  onReply: (m: ChatMessage) => void;
  onEdit: (m: ChatMessage) => void;
  onDelete: (m: ChatMessage) => void;
  onRetry: (m: ChatMessage) => void;
  onJump: (id: string) => void;
  /** The current time, ticking in the parent (the edit window closes while the message is on screen). */
  now: number;
}) {
  const { t, format } = useI18n();
  const deleted = Boolean(m.deletedAt);
  const pending = Boolean(m.pending);
  const editable = mine && !deleted && !pending && now - new Date(m.createdAt).getTime() < EDIT_WINDOW_MS;
  const deletable = !deleted && !pending && (mine || canModerate);
  const name = m.sender?.fullName ?? t("chat.deletedMember");

  return (
    <div id={`msg-${m.id}`} className={cn("group flex items-end gap-2", mine ? "flex-row-reverse" : "flex-row")}>
      {!mine && <div className="w-8 shrink-0">{showAvatar && <ChatAvatar name={name} id={m.senderId ?? m.id} size="sm" />}</div>}

      <div className={cn("flex max-w-[min(34rem,82%)] flex-col", mine ? "items-end" : "items-start")}>
        {showSender && !mine && (
          <span className="mb-0.5 px-3 text-xs font-semibold text-primary">
            <bdi>{name}</bdi>
          </span>
        )}
        <div
          className={cn(
            "relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-xs",
            mine ? "rounded-ee-md bg-primary text-primary-foreground" : "rounded-es-md border bg-card text-card-foreground",
            deleted && "border border-dashed bg-transparent text-muted-foreground shadow-none",
            m.pending === "failed" && "ring-2 ring-destructive/60",
          )}
        >
          {m.replyTo && !deleted && (
            <button
              type="button"
              onClick={() => onJump(m.replyTo!.id)}
              className={cn(
                "mb-1.5 block w-full rounded-lg border-s-4 px-2.5 py-1.5 text-start text-xs",
                mine ? "border-primary-foreground/60 bg-primary-foreground/15" : "border-primary bg-muted",
              )}
            >
              <span className="block font-semibold">
                <bdi>{m.replyTo.senderName ?? t("chat.deletedMember")}</bdi>
              </span>
              <span className="line-clamp-2 opacity-90">{m.replyTo.deleted ? t("chat.deleted") : <bdi>{m.replyTo.body}</bdi>}</span>
            </button>
          )}
          {deleted ? (
            <span className="italic">{t("chat.deleted")}</span>
          ) : (
            <p className="whitespace-pre-wrap break-words" dir="auto">
              <Linkified text={m.body} />
            </p>
          )}
          <span className={cn("mt-0.5 flex items-center justify-end gap-1 text-[0.65rem]", mine && !deleted ? "text-primary-foreground/75" : "text-muted-foreground")}>
            {m.editedAt && !deleted && <span>{t("chat.edited")} ·</span>}
            <time dateTime={m.createdAt} title={format.longDateTime(m.createdAt)}>
              {format.time(m.createdAt)}
            </time>
            {mine && !deleted && <ReceiptIcon receipt={receipt} />}
          </span>
        </div>
        {m.pending === "failed" && (
          <button type="button" onClick={() => onRetry(m)} className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive hover:underline">
            <AlertCircleIcon className="size-3.5" /> {t("chat.failed")} · {t("chat.retry")}
          </button>
        )}
        {receipt?.seenBy !== undefined && receipt.seenBy > 0 && <span className="mt-0.5 px-1 text-[0.65rem] text-muted-foreground">{t("chat.seenBy", { count: receipt.seenBy })}</span>}
      </div>

      {!deleted && !pending && m.kind === "TEXT" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="mb-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-60"
              aria-label={t("chat.messageActions")}
            >
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={mine ? "end" : "start"}>
            <DropdownMenuItem onClick={() => onReply(m)}>
              <ReplyIcon className="rtl:-scale-x-100" /> {t("chat.reply")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void navigator.clipboard?.writeText(m.body).then(() => toast.success(t("chat.copied")));
              }}
            >
              <CopyIcon /> {t("chat.copy")}
            </DropdownMenuItem>
            {editable && (
              <DropdownMenuItem onClick={() => onEdit(m)}>
                <PencilIcon /> {t("chat.edit")}
              </DropdownMenuItem>
            )}
            {deletable && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(m)}>
                  <Trash2Icon /> {t("chat.deleteForAll")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function ReceiptIcon({ receipt }: { receipt: Receipt }) {
  const { t } = useI18n();
  if (!receipt) return null;
  if (receipt.state === "sending") return <ClockIcon className="size-3" aria-label={t("chat.sending")} />;
  if (receipt.state === "failed") return <AlertCircleIcon className="size-3" aria-label={t("chat.failed")} />;
  // Seen: two ticks at full strength (the rest of the line is dimmed).
  if (receipt.state === "seen") return <CheckCheckIcon className="size-3.5 text-primary-foreground" strokeWidth={2.75} aria-label={t("chat.seen")} />;
  return <CheckIcon className="size-3.5" aria-label={t("chat.sent")} />;
}

/** A centered line for what happened in a group ("added …"); its names come isolated. */
export function SystemLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-1">
      <span className="max-w-[90%] rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
        {children}
      </span>
    </div>
  );
}
