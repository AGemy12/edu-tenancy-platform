"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LifeBuoyIcon, Loader2Icon, LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeaveSupport } from "@/hooks/use-auth";
import { useRouter } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import type { AuthUser } from "@/lib/types";

/**
 * Support mode, always in view: who the platform admin is signed in as, until when, and the way
 * out. Also notices when the session ends (closed, run out, signed out) and takes the admin back
 * to the console with nothing of the center left in the cache.
 */
export function SupportBanner({ user }: { user: AuthUser }) {
  const { t, rich, format } = useI18n();
  const qc = useQueryClient();
  const router = useRouter();
  const leave = useLeaveSupport();
  const [leaving, setLeaving] = useState(false);
  const sessionId = user.support?.sessionId ?? null;
  const previous = useRef(sessionId);

  useEffect(() => {
    if (previous.current && !sessionId) {
      qc.clear();
      toast(t("support.left"));
      router.replace("/dashboard/platform/centers");
    }
    previous.current = sessionId;
  }, [sessionId, qc, router, t]);

  if (!user.support) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-highlight px-4 py-2 text-sm text-highlight-foreground md:px-8">
      <LifeBuoyIcon className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {rich("support.banner", {
          name: (
            <span className="font-semibold">
              <bdi>{user.fullName}</bdi>
            </span>
          ),
          role: t(`common.roles.${user.role}`),
          center: (
            <span className="font-semibold">
              <bdi>{user.tenant?.name}</bdi>
            </span>
          ),
        })}{" "}
        <span className="opacity-85">· {t("support.endsAt", { time: format.time(user.support.expiresAt) })}</span>
      </p>
      <Button
        size="xs"
        variant="secondary"
        disabled={leaving}
        onClick={async () => {
          setLeaving(true);
          await leave();
        }}
      >
        {leaving ? <Loader2Icon className="animate-spin" /> : <LogOutIcon data-icon="inline-start" />} {t("support.exit")}
      </Button>
    </div>
  );
}
