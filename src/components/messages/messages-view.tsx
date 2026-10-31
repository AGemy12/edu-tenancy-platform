"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessagesSquareIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { canUseMessages } from "@/hooks/use-messages";
import { cn } from "@/lib/utils";
import { ConversationList } from "./conversation-list";
import { ConversationThread } from "./conversation-thread";
import { ConversationInfo } from "./conversation-info";
import { NewConversation } from "./new-conversation";

/** Inbox and conversation side by side; on phones, one at a time. The open conversation is `?c=` in the URL. */
export function MessagesView() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const params = useSearchParams();
  const active = params.get("c");
  const [creating, setCreating] = useState(false);
  const [info, setInfo] = useState(false);

  const open = useCallback((id: string | null) => {
    const next = new URLSearchParams(window.location.search);
    if (id) next.set("c", id);
    else next.delete("c");
    const qs = next.toString();
    // Opening adds a history entry (the phone's back button closes the conversation).
    window.history[id ? "pushState" : "replaceState"](null, "", qs ? `?${qs}` : window.location.pathname);
    setInfo(false);
  }, []);

  if (!user) return <Skeleton className="h-[calc(100dvh-8rem)] rounded-2xl" />;
  if (!canUseMessages(user)) {
    return <p className="text-muted-foreground">{t("chat.description")}</p>;
  }

  return (
    <Card className="grid h-[calc(100dvh-6rem)] min-h-[30rem] grid-cols-1 gap-0 overflow-hidden p-0 md:h-[calc(100dvh-8rem)] md:grid-cols-[minmax(17rem,22rem)_1fr]">
      <aside className={cn("min-h-0 border-e", active ? "hidden md:block" : "block")}>
        <ConversationList me={user.membershipId!} activeId={active} onOpen={open} onNew={() => setCreating(true)} />
      </aside>
      <section className={cn("min-h-0", active ? "block" : "hidden md:block")}>
        {active ? (
          <ConversationThread key={active} id={active} user={user} onBack={() => open(null)} onInfo={() => setInfo(true)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/25 p-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessagesSquareIcon className="size-7" />
            </span>
            <p className="text-lg font-semibold">{t("chat.pick")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t("chat.pickHint")}</p>
            <Button onClick={() => setCreating(true)}>{t("chat.newChat")}</Button>
          </div>
        )}
      </section>

      {active && <ConversationInfo key={active} id={active} user={user} open={info} onOpenChange={setInfo} onLeft={() => open(null)} />}
      <NewConversation user={user} open={creating} onOpenChange={setCreating} onCreated={open} />
    </Card>
  );
}
