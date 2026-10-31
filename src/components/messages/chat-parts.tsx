"use client";

import { Fragment, useEffect, useState } from "react";
import { BookOpenIcon, UsersIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";
import { isolate } from "@/components/notifications/notification-text";
import { useChatStore } from "@/stores/chat-store";
import type { ChatMessage, Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-primary/15 text-primary",
  "bg-info/15 text-info",
  "bg-success/15 text-success",
  "bg-warning/20 text-warning-foreground dark:text-warning",
  "bg-highlight/20 text-highlight-foreground dark:text-highlight",
  "bg-destructive/10 text-destructive",
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    // Titles such as "Dr." are skipped: the initials are the name's.
    .filter((w) => w && !w.endsWith("."))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

/** A person's (or group's) round avatar; the color follows the name, the dot shows who is online. */
export function ChatAvatar({
  name,
  id,
  online,
  group,
  course,
  size = "md",
}: {
  name: string;
  id: string;
  online?: boolean;
  group?: boolean;
  course?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-14 text-lg" : "size-11 text-sm";
  const Icon = course ? BookOpenIcon : UsersIcon;
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full font-bold", box, PALETTE[hash(id) % PALETTE.length])} aria-hidden="true">
      {group ? <Icon className={size === "lg" ? "size-6" : "size-[45%]"} /> : initials(name) || "?"}
      {online && <span className={cn("absolute bottom-0 end-0 rounded-full bg-success ring-2 ring-card", size === "sm" ? "size-2.5" : "size-3")} />}
    </span>
  );
}

/** Live presence when known, else what the API said. */
export function usePresence(membershipId: string | null | undefined, fallback?: { online?: boolean; lastSeenAt?: string | null }) {
  const live = useChatStore((s) => (membershipId ? s.presence[membershipId] : undefined));
  return { online: live?.online ?? fallback?.online ?? false, lastSeenAt: live?.lastSeenAt ?? fallback?.lastSeenAt ?? null };
}

/** Who is typing in a conversation (expired signals drop out by themselves). */
export function useTyping(conversationId: string | null, me: string | null | undefined) {
  const entries = useChatStore((s) => (conversationId ? s.typing[conversationId] : undefined));
  const [now, setNow] = useState(() => Date.now());
  const active = Object.entries(entries ?? {})
    .filter(([id, until]) => id !== me && until > now)
    .map(([id]) => id);
  useEffect(() => {
    if (!active.length) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [active.length]);
  return active;
}

/** The name shown for a conversation. */
export function conversationName(c: Pick<Conversation, "kind" | "title" | "peer">, fallback: string) {
  return c.kind === "GROUP" ? (c.title ?? fallback) : (c.peer?.fullName ?? fallback);
}

/** "Created the group", "added A and B"… told in the page's language. */
export function useSystemText() {
  const { t, has, format } = useI18n();
  return (m: ChatMessage) => {
    const p = (m.params ?? {}) as Record<string, unknown>;
    const key = `chat.system.${String(p.event)}`;
    if (!has(key)) return "";
    const members = Array.isArray(p.members) ? format.list(p.members.map((m) => isolate(String(m)))) : "";
    return t(key as MessageKey, { actor: isolate(String(p.actor ?? "")), title: isolate(String(p.title ?? "")), member: isolate(String(p.member ?? "")), members });
  };
}

const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]}])/g;

/** Message text with web links made clickable (left-to-right, opened in a new tab). */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" dir="ltr" className="break-words underline underline-offset-2 hover:opacity-80">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Same calendar day in the viewer's zone. */
export function sameDay(a: string | Date, b: string | Date) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** "14:05" today, "Mon" this week, else a short date: for inbox rows. */
export function useShortTime() {
  const { format } = useI18n();
  return (iso: string) => {
    const at = new Date(iso);
    const now = new Date();
    if (sameDay(at, now)) return format.time(at);
    if (now.getTime() - at.getTime() < 6 * 86_400_000) return format.weekday(at.getDay(), "short");
    return format.date(at);
  };
}
