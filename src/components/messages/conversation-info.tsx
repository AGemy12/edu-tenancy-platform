"use client";

import { useState } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, BellIcon, BellOffIcon, EllipsisIcon, LogOutIcon, ShieldIcon, ShieldOffIcon, UserMinusIcon, UserPlusIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAddMembers, useConversation, useConversationSettings, useRemoveMember, useSetMemberRole, useUpdateGroup } from "@/hooks/use-messages";
import type { AuthUser } from "@/lib/types";
import { ChatAvatar, conversationName, usePresence } from "./chat-parts";
import { ContactPicker } from "./new-conversation";
import { isolate } from "@/components/notifications/notification-text";

export function ConversationInfo({
  id,
  user,
  open,
  onOpenChange,
  onLeft,
}: {
  id: string;
  user: AuthUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeft: () => void;
}) {
  const { t, dir } = useI18n();
  const me = user.membershipId!;
  const detail = useConversation(id);
  const settings = useConversationSettings(id);
  const update = useUpdateGroup(id);
  const removeMember = useRemoveMember(id);
  const setRole = useSetMemberRole(id);
  const addMembers = useAddMembers(id);
  const [leaving, setLeaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState<string | null>(null);

  const c = detail.data;
  if (!c) return null;
  const group = c.kind === "GROUP";
  const name = conversationName(c, t("chat.deletedMember"));
  const present = new Set(c.participants.map((p) => p.membershipId));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={dir === "rtl" ? "left" : "right"} className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="items-center gap-2 border-b p-6 text-center">
          <ChatAvatar name={name} id={c.peer?.membershipId ?? c.id} group={group} course={Boolean(c.course)} size="lg" />
          <SheetTitle className="text-lg">
            <bdi>{name}</bdi>
          </SheetTitle>
          <SheetDescription>
            {group ? (c.course ? t("chat.info.course", { course: isolate(c.course.title) }) : t("chat.members", { count: c.memberCount })) : c.peer ? t(`common.roles.${c.peer.role}`) : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-1 p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={() => settings.mutate({ muted: !c.muted })}>
            {c.muted ? <BellIcon /> : <BellOffIcon />} {c.muted ? t("chat.info.unmute") : t("chat.info.mute")}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              settings.mutate({ archived: !c.archived });
              if (!c.archived) onLeft();
            }}
          >
            {c.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />} {c.archived ? t("chat.info.unarchive") : t("chat.info.archive")}
          </Button>
        </div>

        {group && c.isAdmin && (
          <>
            <Separator />
            <div className="space-y-4 p-5">
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const next = (title ?? c.title ?? "").trim();
                  if (next && next !== c.title) update.mutate({ title: next });
                }}
              >
                <label htmlFor="group-title" className="text-sm font-medium">
                  {t("chat.info.name")}
                </label>
                <div className="flex gap-2">
                  <Input id="group-title" value={title ?? c.title ?? ""} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
                  <Button type="submit" variant="outline" disabled={update.isPending || !(title ?? "").trim() || title === c.title}>
                    {t("common.actions.save")}
                  </Button>
                </div>
              </form>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="block font-medium">{t("chat.info.adminsOnly")}</span>
                  <span className="block text-xs text-muted-foreground">{t("chat.new.adminsOnlyHint")}</span>
                </span>
                <Switch checked={c.adminsOnly} onCheckedChange={(v) => update.mutate({ adminsOnly: v })} />
              </label>
            </div>
          </>
        )}

        {group && (
          <>
            <Separator />
            <div className="p-3">
              <div className="flex items-center justify-between px-2 pb-2">
                <h3 className="text-sm font-semibold">
                  {t("chat.info.members")} <span className="text-muted-foreground">({c.memberCount})</span>
                </h3>
                {c.isAdmin && !c.course && (
                  <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                    <UserPlusIcon /> {t("chat.info.add")}
                  </Button>
                )}
              </div>
              <ul className="space-y-0.5">
                {c.participants.map((p) => (
                  <MemberRow
                    key={p.membershipId}
                    participant={p}
                    me={me}
                    canManage={c.isAdmin && p.membershipId !== me}
                    onToggleAdmin={() => setRole.mutate({ membershipId: p.membershipId, isAdmin: !p.isAdmin })}
                    onRemove={() => removeMember.mutate(p.membershipId)}
                  />
                ))}
              </ul>
            </div>
            <Separator />
            <div className="p-3">
              <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => setLeaving(true)}>
                <LogOutIcon className="rtl:rotate-180" /> {t("chat.info.leave")}
              </Button>
            </div>
          </>
        )}

        <Dialog open={leaving} onOpenChange={setLeaving}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("chat.info.leaveTitle")}</DialogTitle>
              <DialogDescription>{t("chat.info.leaveText")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaving(false)}>
                {t("common.actions.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  removeMember.mutate(me, {
                    onSuccess: () => {
                      setLeaving(false);
                      onOpenChange(false);
                      onLeft();
                    },
                  })
                }
              >
                {t("chat.info.leave")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={adding}
          onOpenChange={(v) => {
            setAdding(v);
            if (!v) setPicked([]);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("chat.info.addTitle")}</DialogTitle>
            </DialogHeader>
            <ContactPicker selected={picked} onChange={setPicked} exclude={present} />
            <DialogFooter>
              <Button
                disabled={!picked.length || addMembers.isPending}
                onClick={() =>
                  addMembers.mutate(picked, {
                    onSuccess: () => {
                      setAdding(false);
                      setPicked([]);
                    },
                  })
                }
              >
                {t("chat.info.add")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function MemberRow({
  participant: p,
  me,
  canManage,
  onToggleAdmin,
  onRemove,
}: {
  participant: { membershipId: string; fullName: string; role: AuthUser["role"]; isAdmin: boolean; online: boolean; lastSeenAt: string | null };
  me: string;
  canManage: boolean;
  onToggleAdmin: () => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const presence = usePresence(p.membershipId, p);
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
      <ChatAvatar name={p.fullName} id={p.membershipId} size="sm" online={presence.online} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          <bdi>{p.fullName}</bdi> {p.membershipId === me && <span className="text-muted-foreground">({t("chat.you")})</span>}
        </p>
        <p className="text-xs text-muted-foreground">{t(`common.roles.${p.role}`)}</p>
      </div>
      {p.isAdmin && <Badge variant="info">{t("chat.info.admin")}</Badge>}
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label={t("common.labels.actions")}>
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleAdmin}>
              {p.isAdmin ? <ShieldOffIcon /> : <ShieldIcon />} {p.isAdmin ? t("chat.info.removeAdmin") : t("chat.info.makeAdmin")}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onRemove}>
              <UserMinusIcon /> {t("chat.info.remove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
