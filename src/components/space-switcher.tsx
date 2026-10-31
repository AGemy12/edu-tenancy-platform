"use client";

import { Building2Icon, CheckIcon, ChevronsUpDownIcon, LayoutGridIcon, LifeBuoyIcon, PlusIcon, ShieldIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSwitchMembership } from "@/hooks/use-auth";
import { Link } from "@/i18n/navigation";
import { useT } from "@/i18n/provider";
import type { AuthUser } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The sidebar's head: the space the session is in, and (when there are others) a menu to jump
 * straight to another one, see them all, or start a new one.
 */
export function SpaceSwitcher({ user }: { user: AuthUser }) {
  const t = useT();
  const switchTo = useSwitchMembership();
  const memberships = user.memberships ?? [];
  const inConsole = user.membershipId === null;
  const name = user.tenant?.name ?? t("spaces.platform");
  const sub = user.tenant?.slug ?? t(`common.roles.${user.role}`);

  // Support mode stays in the one center it entered; the banner is the way out.
  if (user.support) {
    return (
      <div className="flex w-full items-center gap-3 px-5 py-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-highlight text-highlight-foreground" aria-hidden="true">
          <LifeBuoyIcon className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">
            <bdi>{name}</bdi>
          </span>
          <span className="block truncate text-xs text-muted-foreground">{t("support.mode")}</span>
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 px-5 py-5 text-start transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={t("spaces.switcherLabel")}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground" aria-hidden="true">
            {inConsole ? <ShieldIcon className="size-4.5" /> : <Building2Icon className="size-4.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">
              <bdi>{name}</bdi>
            </span>
            <span className="block truncate text-xs text-muted-foreground" dir={user.tenant ? "ltr" : undefined}>
              {sub}
            </span>
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("spaces.switcherLabel")}</DropdownMenuLabel>
        {user.isPlatformAdmin && (
          <DropdownMenuItem disabled={switchTo.isPending} onClick={() => !inConsole && switchTo.mutate(null)}>
            <ShieldIcon />
            <span className="flex-1 truncate">{t("spaces.platform")}</span>
            {inConsole && <CheckIcon className="text-primary" />}
          </DropdownMenuItem>
        )}
        {memberships.map((m) => {
          const current = m.id === user.membershipId;
          return (
            <DropdownMenuItem key={m.id} disabled={!m.usable || switchTo.isPending} onClick={() => !current && switchTo.mutate(m.id)}>
              <Building2Icon />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate", current && "font-semibold")}>
                  <bdi>{m.tenant.name}</bdi>
                </span>
                <span className="block truncate text-xs text-muted-foreground">{t(`common.roles.${m.role}`)}</span>
              </span>
              {current && <CheckIcon className="text-primary" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/spaces">
            <LayoutGridIcon /> {t("spaces.all")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/spaces?new=1">
            <PlusIcon /> {t("spaces.newSpace")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
