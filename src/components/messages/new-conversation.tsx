"use client";

import { useEffect, useState } from "react";
import { BookOpenIcon, CheckIcon, Loader2Icon, SearchIcon, UsersIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useList } from "@/hooks/use-resources";
import { useContacts, useCreateGroup, useStartDirect } from "@/hooks/use-messages";
import type { AuthUser, ChatContact } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChatAvatar, usePresence } from "./chat-parts";

function useDebounced<T>(value: T, ms = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Start a direct chat with someone the rules allow, or (admins, teachers) a group. */
export function NewConversation({
  user,
  open,
  onOpenChange,
  onCreated,
}: {
  user: AuthUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useI18n();
  const canGroup = user.role === "TENANT_ADMIN" || user.role === "TEACHER";
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const contacts = useContacts(query, open);
  const direct = useStartDirect();

  const start = (c: ChatContact) =>
    direct.mutate(c.membershipId, {
      onSuccess: (conv) => {
        onOpenChange(false);
        if ("id" in conv) onCreated(conv.id);
      },
    });

  const directPane = (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("chat.new.search")} aria-label={t("chat.new.search")} className="ps-9" />
      </div>
      <div className="max-h-80 min-h-40 overflow-y-auto rounded-xl border">
        {contacts.isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !contacts.data?.length ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{query ? t("chat.new.noContacts") : t("chat.new.whoCanI")}</p>
        ) : (
          <ul className="p-1">
            {contacts.data.map((c) => (
              <li key={c.membershipId}>
                <button
                  type="button"
                  disabled={direct.isPending}
                  onClick={() => start(c)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                >
                  <ContactLine contact={c} />
                  {direct.isPending && direct.variables === c.membershipId && <Loader2Icon className="size-4 animate-spin" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("chat.new.whoCanI")}</p>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setQ("");
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("chat.new.title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("chat.new.whoCanI")}</DialogDescription>
        </DialogHeader>
        {canGroup ? (
          <Tabs defaultValue="direct">
            <TabsList className="w-full">
              <TabsTrigger value="direct" className="flex-1">
                {t("chat.new.direct")}
              </TabsTrigger>
              <TabsTrigger value="group" className="flex-1">
                {t("chat.new.group")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="direct" className="mt-4">
              {directPane}
            </TabsContent>
            <TabsContent value="group" className="mt-4">
              <GroupForm
                onCreated={(id) => {
                  onOpenChange(false);
                  onCreated(id);
                }}
              />
            </TabsContent>
          </Tabs>
        ) : (
          directPane
        )}
      </DialogContent>
    </Dialog>
  );
}

function GroupForm({ onCreated }: { onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<"free" | "course">("free");
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [members, setMembers] = useState<string[]>([]);
  const courses = useList<{ id: string; title: string }>("/courses", kind === "course");
  const create = useCreateGroup();
  const valid = kind === "course" ? Boolean(courseId) : title.trim().length > 0;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        create.mutate(kind === "course" ? { courseId, adminsOnly, title: title.trim() || undefined } : { title: title.trim(), membershipIds: members, adminsOnly }, {
          onSuccess: (c) => "id" in c && onCreated(c.id),
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("chat.new.kind")}>
        {(["free", "course"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition-colors",
              kind === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              {k === "free" ? <UsersIcon className="size-4" /> : <BookOpenIcon className="size-4" />}
              {k === "free" ? t("chat.new.free") : t("chat.new.course")}
            </span>
            <span className="text-xs text-muted-foreground">{k === "free" ? t("chat.new.freeHint") : t("chat.new.courseHint")}</span>
          </button>
        ))}
      </div>

      {kind === "course" && (
        <div className="space-y-1.5">
          <label htmlFor="group-course" className="text-sm font-medium">
            {t("chat.new.pickCourse")}
          </label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger id="group-course" className="w-full">
              <SelectValue placeholder={t("common.select.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {courses.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <bdi>{c.title}</bdi>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="group-name" className="text-sm font-medium">
          {t("chat.new.groupName")}
        </label>
        <Input id="group-name" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} required={kind === "free"} />
      </div>

      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="block font-medium">{t("chat.new.adminsOnly")}</span>
          <span className="block text-xs text-muted-foreground">{t("chat.new.adminsOnlyHint")}</span>
        </span>
        <Switch checked={adminsOnly} onCheckedChange={setAdminsOnly} />
      </label>

      {kind === "free" && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t("chat.new.members")}</p>
          <ContactPicker selected={members} onChange={setMembers} />
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={!valid || create.isPending}>
          {create.isPending && <Loader2Icon className="animate-spin" />}
          {t("chat.new.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Pick several people the caller may message (for groups). */
export function ContactPicker({ selected, onChange, exclude }: { selected: string[]; onChange: (ids: string[]) => void; exclude?: Set<string> }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const contacts = useContacts(query);
  const rows = contacts.data?.filter((c) => !exclude?.has(c.membershipId)) ?? [];
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("chat.new.search")} aria-label={t("chat.new.search")} className="ps-9" />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-xl border">
        {contacts.isLoading ? (
          <Skeleton className="m-3 h-10" />
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("chat.new.noContacts")}</p>
        ) : (
          <ul className="p-1" role="listbox" aria-multiselectable="true">
            {rows.map((c) => {
              const on = selected.includes(c.membershipId);
              return (
                <li key={c.membershipId} role="option" aria-selected={on}>
                  <button type="button" onClick={() => toggle(c.membershipId)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-muted">
                    <ContactLine contact={c} />
                    <span
                      className={cn("flex size-5 shrink-0 items-center justify-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "border-input")}
                      aria-hidden="true"
                    >
                      {on && <CheckIcon className="size-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("chat.new.selected", { count: selected.length })}</p>
    </div>
  );
}

function ContactLine({ contact: c }: { contact: ChatContact }) {
  const { t } = useI18n();
  const presence = usePresence(c.membershipId, c);
  return (
    <>
      <ChatAvatar name={c.fullName} id={c.membershipId} size="sm" online={presence.online} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          <bdi>{c.fullName}</bdi>
        </span>
        <span className="block text-xs text-muted-foreground">{t(`common.roles.${c.role}`)}</span>
      </span>
    </>
  );
}
