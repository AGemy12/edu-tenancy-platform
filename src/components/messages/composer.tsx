"use client";

import { useEffect, useRef, useState } from "react";
import { LockIcon, PencilIcon, ReplyIcon, SendHorizontalIcon, XIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/realtime";
import { isolate } from "@/components/notifications/notification-text";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX = 4000;
/** One "typing" signal at most this often (the server throttles too). */
const TYPING_EVERY_MS = 2_500;

export function Composer({
  conversationId,
  disabledReason,
  replyTo,
  editing,
  onCancel,
  onSend,
  onSaveEdit,
}: {
  conversationId: string;
  /** Why this person can't write here (suspended, admins-only group…); null when they can. */
  disabledReason: string | null;
  replyTo: ChatMessage | null;
  editing: ChatMessage | null;
  onCancel: () => void;
  onSend: (body: string) => void;
  onSaveEdit: (m: ChatMessage, body: string) => void;
}) {
  const { t } = useI18n();
  // The parent remounts this per conversation and per edited message, so the text starts right.
  const [text, setText] = useState(editing?.body ?? "");
  const area = useRef<HTMLTextAreaElement>(null);
  const lastTyping = useRef(0);

  useEffect(() => {
    area.current?.focus();
  }, [replyTo]);

  // Grows with the text up to six lines.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [text]);

  if (disabledReason) {
    return (
      <div className="flex items-center justify-center gap-2 border-t bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
        <LockIcon className="size-4" aria-hidden="true" /> {disabledReason}
      </div>
    );
  }

  const body = text.trim();
  const tooLong = text.length > MAX;

  const submit = () => {
    if (!body || tooLong) return;
    if (editing) {
      if (body !== editing.body) onSaveEdit(editing, body);
      else onCancel();
    } else onSend(body);
    setText("");
  };

  const typing = () => {
    const now = Date.now();
    if (now - lastTyping.current < TYPING_EVERY_MS) return;
    lastTyping.current = now;
    getSocket()?.emit("typing", { conversationId });
  };

  return (
    <div className="border-t bg-card/80 p-3 backdrop-blur">
      {(replyTo || editing) && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border-s-4 border-primary bg-muted/60 px-3 py-2 text-xs">
          {editing ? <PencilIcon className="mt-0.5 size-3.5 shrink-0 text-primary" /> : <ReplyIcon className="mt-0.5 size-3.5 shrink-0 text-primary rtl:-scale-x-100" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-primary">
              {editing ? t("chat.editing") : t("chat.replyingTo", { name: isolate(replyTo?.sender?.fullName ?? t("chat.deletedMember")) })}
            </p>
            <p className="truncate text-muted-foreground">
              <bdi>{(editing ?? replyTo)?.body}</bdi>
            </p>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={() => { onCancel(); setText(""); }} aria-label={t("chat.cancelReply")}>
            <XIcon />
          </Button>
        </div>
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="min-w-0 flex-1">
          <textarea
            ref={area}
            rows={1}
            value={text}
            dir="auto"
            placeholder={t("chat.composer.placeholder")}
            aria-label={t("chat.composer.placeholder")}
            aria-describedby="composer-hint"
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value) typing();
            }}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter (or composing with an input method) adds a line.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape" && (replyTo || editing)) {
                onCancel();
                setText("");
              }
            }}
            className={cn(
              "block max-h-42 min-h-11 w-full resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm leading-relaxed shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              tooLong && "border-destructive focus-visible:ring-destructive/20",
            )}
          />
          <p id="composer-hint" className={cn("mt-1 hidden px-2 text-[0.65rem] text-muted-foreground sm:block", tooLong && "text-destructive")}>
            {tooLong ? t("chat.composer.tooLong", { max: MAX }) : t("chat.composer.hint")}
          </p>
        </div>
        <Button type="submit" size="icon-lg" className="mb-0 rounded-full sm:mb-5" disabled={!body || tooLong} aria-label={t("chat.composer.send")}>
          <SendHorizontalIcon className="rtl:-scale-x-100" />
        </Button>
      </form>
    </div>
  );
}
