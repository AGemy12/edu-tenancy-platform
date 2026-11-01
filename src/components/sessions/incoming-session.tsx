"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog as DialogPrimitive } from "radix-ui";
import { PhoneIcon, PhoneOffIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isolate } from "@/components/notifications/notification-text";
import { joinSession, ringingKey, useRingingSession, type Ringing } from "@/hooks/use-ringing";
import { useI18n } from "@/i18n/provider";
import { desktopAlert, ringtone } from "@/lib/alerts";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/types";

/** Sessions this tab was told "later" for: they don't ring again here, the banner stays. */
const LATER_KEY = "edu.ring.later";

function readLater(): string[] {
  try {
    const ids: unknown = JSON.parse(sessionStorage.getItem(LATER_KEY) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeLater(ids: string[]) {
  try {
    sessionStorage.setItem(LATER_KEY, JSON.stringify(ids.slice(-20)));
  } catch {}
}

/**
 * When a student's session starts, it calls them like a phone: a whole-screen call with the
 * teacher's picture, a ringtone and two big buttons, made for a child who may not read yet.
 * "Answer" enters the meeting; "Later" (or the ring running out) leaves a "join now" banner on
 * every page until they enter or the session ends. Neither is recorded as an absence.
 */
export function IncomingSession({ user }: { user: AuthUser }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  // Support mode works as the member but is never the child: no ringing there.
  const enabled = user.role === "STUDENT" && !user.support && user.status !== "SUSPENDED";
  const { data: session } = useRingingSession(enabled);
  const [later, setLater] = useState(readLater);
  const [rungOut, setRungOut] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // It rings for what the server said was left of the ring, then turns into the banner.
  useEffect(() => {
    if (!session?.ringMs) return;
    const timer = setTimeout(() => setRungOut(session.id), Math.max(0, session.ringsUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);

  const ringing = Boolean(enabled && session && session.ringMs > 0 && rungOut !== session.id && !later.includes(session.id));
  const callId = ringing ? session!.id : null;
  const alertTitle = session ? t("sessions.ringing.alertTitle", { name: isolate(session.teacherName) }) : "";
  const alertBody = session ? t("sessions.ringing.alertBody", { title: isolate(session.title) }) : "";

  useEffect(() => {
    if (!callId) return;
    const alert = desktopAlert(alertTitle, alertBody, { tag: `ring:${callId}`, requireInteraction: true });
    const stop = ringtone();
    return () => {
      stop();
      alert?.close();
    };
  }, [callId, alertTitle, alertBody]);

  if (!enabled || !session) return null;

  async function answer(id: string) {
    setJoining(true);
    try {
      await joinSession(id);
      qc.setQueryData(ringingKey, null);
      qc.invalidateQueries({ queryKey: ["list"] });
    } catch (e) {
      toast.error(getErrorMessage(e, t("sessions.toast.openFailed")));
      qc.invalidateQueries({ queryKey: ringingKey });
    } finally {
      setJoining(false);
    }
  }

  function putOff(id: string) {
    const next = [...later, id];
    setLater(next);
    writeLater(next);
  }

  return (
    <>
      {!ringing && <EnterBanner session={session} busy={joining} onEnter={() => void answer(session.id)} />}
      <DialogPrimitive.Root open={ringing} onOpenChange={(open) => !open && putOff(session.id)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0" />
          <DialogPrimitive.Content
            role="alertdialog"
            // A stray tap beside the card is not an answer; Escape is "later".
            onPointerDownOutside={(e) => e.preventDefault()}
            className="fixed inset-0 z-50 flex flex-col items-center justify-between gap-8 overflow-y-auto bg-call px-6 py-12 text-call-foreground outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 sm:inset-auto sm:start-1/2 sm:top-1/2 sm:w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:justify-center sm:rounded-[2rem] sm:px-9 sm:py-10 sm:shadow-2xl sm:rtl:translate-x-1/2"
          >
            <p className="flex items-center gap-2 rounded-full bg-call-chip px-4 py-2 text-base font-medium">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-call-live motion-safe:animate-pulse" />
              {t("sessions.ringing.started", { title: isolate(session.title) })}
            </p>

            <div className="flex flex-col items-center gap-3 text-center">
              <Caller name={session.teacherName} />
              <DialogPrimitive.Title className="text-4xl leading-tight font-bold">
                <bdi>{session.teacherName}</bdi>
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-2xl font-medium text-call-muted">{t("sessions.ringing.calling")}</DialogPrimitive.Description>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="flex items-start justify-center gap-16">
                <CallButton tone="answer" icon={PhoneIcon} disabled={joining} onClick={() => void answer(session.id)}>
                  {t("sessions.ringing.answer")}
                </CallButton>
                <CallButton tone="decline" icon={PhoneOffIcon} onClick={() => putOff(session.id)}>
                  {t("sessions.ringing.later")}
                </CallButton>
              </div>
              <p className="text-base text-call-muted">{t("sessions.ringing.hint")}</p>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

const HALO_DELAYS = ["", "[animation-delay:0.7s]", "[animation-delay:1.4s]"];

/** The teacher's initial in a big circle, with rings spreading out while it calls. */
function Caller({ name }: { name: string }) {
  return (
    <div className="relative mb-6 size-40 sm:size-36" aria-hidden="true">
      {HALO_DELAYS.map((delay) => (
        <span key={delay} className={cn("absolute inset-0 rounded-full border-3 border-call-muted opacity-0 motion-safe:animate-[call-halo_2.1s_ease-out_infinite]", delay)} />
      ))}
      <span className="absolute inset-0 flex items-center justify-center rounded-full border-6 border-call-foreground bg-highlight text-7xl font-bold text-highlight-foreground">
        {Array.from(name.trim())[0] ?? ""}
      </span>
    </div>
  );
}

function CallButton({ tone, icon: Icon, children, ...props }: ComponentProps<"button"> & { tone: "answer" | "decline"; icon: LucideIcon }) {
  return (
    <button
      type="button"
      className="group flex flex-col items-center gap-3 rounded-2xl text-xl font-bold outline-none focus-visible:ring-4 focus-visible:ring-call-muted/60 disabled:opacity-60"
      {...props}
    >
      <span
        className={cn(
          "flex size-24 items-center justify-center rounded-full text-call-foreground transition-transform group-hover:scale-105 group-active:scale-95",
          tone === "answer" ? "bg-call-answer ring-8 ring-call-answer/30" : "bg-call-decline",
        )}
      >
        <Icon aria-hidden="true" className={cn("size-10", tone === "answer" && "motion-safe:animate-[bell-ring_1.3s_ease-in-out_infinite]")} />
      </span>
      {children}
    </button>
  );
}

/** After "later" or once the ring ran out: one big button, on every page, until they enter. */
function EnterBanner({ session, busy, onEnter }: { session: Ringing; busy: boolean; onEnter: () => void }) {
  const { t } = useI18n();
  return (
    <section
      aria-live="polite"
      className="mb-6 flex flex-col gap-4 rounded-2xl bg-success p-5 text-success-foreground shadow-soft sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-success-foreground text-success">
          <PhoneIcon aria-hidden="true" className="size-7 motion-safe:animate-[bell-ring_1.6s_ease-in-out_infinite]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-xl font-bold">{t("sessions.ringing.bannerTitle")}</p>
          <p className="opacity-90">{t("sessions.ringing.bannerText", { name: isolate(session.teacherName), title: isolate(session.title) })}</p>
        </div>
      </div>
      <Button
        size="lg"
        disabled={busy}
        onClick={onEnter}
        className="h-14 rounded-xl bg-success-foreground px-8 text-lg font-bold text-success hover:bg-success-foreground/90"
      >
        <PhoneIcon aria-hidden="true" data-icon="inline-start" />
        {t("sessions.ringing.enter")}
      </Button>
    </section>
  );
}
