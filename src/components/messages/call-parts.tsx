"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PhoneCallIcon, PhoneIncomingIcon, PhoneMissedIcon, PhoneOffIcon, PhoneOutgoingIcon, VideoIcon, VideoOffIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/api";
import { callKeys, callStatus, endCall, joinCall, placeCall } from "@/hooks/use-calls";
import { isolate } from "@/components/notifications/notification-text";
import type { CallState, CallStatus, ChatCall, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const PREVIEW = {
  RINGING: "chat.call.preview.RINGING",
  ACTIVE: "chat.call.preview.ACTIVE",
  ENDED: "chat.call.preview.ENDED",
  MISSED: "chat.call.preview.MISSED",
} as const;

/** "Missed call", "Call in progress"…: the inbox line of a call card. */
export function useCallPreview() {
  const { t } = useI18n();
  return (m: ChatMessage) => (m.call ? t(PREVIEW[callStatus(m.call)]) : t("chat.call.unknown"));
}

const isOpen = (status: CallStatus) => status === "RINGING" || status === "ACTIVE";

/** Runs a call action: errors become a toast, and the header's call state is refetched either way. */
function useCallAction(conversationId: string) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      toast.error(getErrorMessage(e, t("chat.call.failed")));
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: callKeys.state(conversationId) });
    }
  };
  return { busy, run };
}

/**
 * The header's call button in a teacher–student chat: answer or rejoin the call that is on, or
 * place one while a session of theirs is on. Otherwise it is off and says when calling opens.
 */
export function CallButton({ conversationId, me, state, disabled, now }: { conversationId: string; me: string; state: CallState | undefined; disabled: boolean; now: number }) {
  const { t } = useI18n();
  const { busy, run } = useCallAction(conversationId);
  const call = state?.call && isOpen(callStatus(state.call, now)) ? state.call : null;

  if (call && !disabled) {
    const label = call.status === "ACTIVE" ? t("chat.call.join") : call.callerId === me ? t("chat.call.reopen") : t("chat.call.answer");
    return (
      <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" disabled={busy} onClick={() => run(() => joinCall(call.id))} aria-label={label}>
        <PhoneCallIcon className="animate-pulse" />
        <span className="hidden sm:inline">{label}</span>
      </Button>
    );
  }
  if (state?.session && !disabled) {
    return (
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => placeCall(conversationId))} aria-label={t("chat.call.callLabel")}>
        <VideoIcon />
        <span className="hidden sm:inline">{t("chat.call.call")}</span>
      </Button>
    );
  }
  const closed = t("chat.call.closed", { minutes: state?.earlyMinutes ?? 15 });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A disabled button gets no pointer events: the wrapper carries the hint. */}
        <span tabIndex={0} aria-label={`${t("chat.call.callLabel")}: ${closed}`} className="rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Button variant="ghost" size="icon-sm" disabled tabIndex={-1} aria-hidden="true">
            <VideoOffIcon />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{closed}</TooltipContent>
    </Tooltip>
  );
}

/**
 * A call in the chat: who called, how it went, and what can be done with it now (answer, rejoin,
 * hang up; call back from the latest one while the session is on).
 */
export function CallCard({
  message: m,
  me,
  peerName,
  canCallBack,
  disabled,
  now,
}: {
  message: ChatMessage;
  me: string;
  /** The other side of the chat. */
  peerName: string;
  /** The latest call, and a session of theirs is on. */
  canCallBack: boolean;
  disabled: boolean;
  now: number;
}) {
  const { t, format } = useI18n();
  const { busy, run } = useCallAction(m.conversationId);
  const call: ChatCall | null = m.call ?? null;
  const status = call ? callStatus(call, now) : null;
  const outgoing = (call?.callerId ?? m.senderId) === me;
  const callerName = isolate(m.sender?.fullName ?? t("chat.deletedMember"));
  const peer = isolate(peerName);

  let title = t("chat.call.unknown");
  let Icon = PhoneCallIcon;
  if (status === "RINGING") {
    title = outgoing ? t("chat.call.outgoing", { name: peer }) : t("chat.call.incoming", { name: callerName });
    Icon = outgoing ? PhoneOutgoingIcon : PhoneIncomingIcon;
  } else if (status === "ACTIVE") {
    title = t("chat.call.active");
  } else if (status === "ENDED") {
    title = t("chat.call.ended");
    Icon = PhoneOffIcon;
  } else if (status === "MISSED") {
    title = outgoing ? t("chat.call.missedOutgoing", { name: peer }) : t("chat.call.missedIncoming", { name: callerName });
    Icon = PhoneMissedIcon;
  }
  const minutes = status === "ENDED" && call?.answeredAt && call.endedAt ? Math.floor((new Date(call.endedAt).getTime() - new Date(call.answeredAt).getTime()) / 60_000) : null;
  const lasted = minutes === null ? null : minutes < 1 ? t("chat.call.underMinute") : t("chat.call.lasted", { count: minutes });

  return (
    <div id={`msg-${m.id}`} className={cn("flex py-1", outgoing ? "justify-end" : "justify-start")}>
      <div className="flex max-w-[min(26rem,90%)] items-center gap-3 rounded-2xl border bg-card px-3.5 py-2.5 text-card-foreground shadow-xs">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            status === "MISSED" ? "bg-destructive/10 text-destructive" : status && isOpen(status) ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className={cn("size-5", status === "RINGING" && "animate-pulse")} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            <time dateTime={m.createdAt} title={format.longDateTime(m.createdAt)}>
              {format.time(m.createdAt)}
            </time>
            {lasted && ` · ${lasted}`}
          </p>
          {!disabled && call && status && (isOpen(status) || canCallBack) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {status === "RINGING" && !outgoing && (
                <>
                  <Button size="xs" className="bg-success text-success-foreground hover:bg-success/90" disabled={busy} onClick={() => run(() => joinCall(call.id))}>
                    <PhoneCallIcon /> {t("chat.call.answer")}
                  </Button>
                  <Button size="xs" variant="destructive" disabled={busy} onClick={() => run(() => endCall(call.id))}>
                    <PhoneOffIcon /> {t("chat.call.decline")}
                  </Button>
                </>
              )}
              {status === "RINGING" && outgoing && (
                <>
                  <Button size="xs" variant="outline" disabled={busy} onClick={() => run(() => joinCall(call.id))}>
                    {t("chat.call.reopen")}
                  </Button>
                  <Button size="xs" variant="ghost" className="text-destructive" disabled={busy} onClick={() => run(() => endCall(call.id))}>
                    {t("chat.call.callOff")}
                  </Button>
                </>
              )}
              {status === "ACTIVE" && (
                <>
                  <Button size="xs" className="bg-success text-success-foreground hover:bg-success/90" disabled={busy} onClick={() => run(() => joinCall(call.id))}>
                    <PhoneCallIcon /> {t("chat.call.join")}
                  </Button>
                  <Button size="xs" variant="ghost" className="text-destructive" disabled={busy} onClick={() => run(() => endCall(call.id))}>
                    {t("chat.call.hangUp")}
                  </Button>
                </>
              )}
              {!isOpen(status) && canCallBack && (
                <Button size="xs" variant="outline" disabled={busy} onClick={() => run(() => placeCall(m.conversationId))}>
                  <VideoIcon /> {t("chat.call.callBack")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
