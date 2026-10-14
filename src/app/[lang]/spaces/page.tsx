"use client";

import { Suspense, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeftIcon, Loader2Icon, LogOutIcon, PlusIcon, SearchIcon, ShieldIcon } from "lucide-react";
import { AccountStatusBadge } from "@/components/account-status";
import { TextField } from "@/components/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateTenant, useCurrentUser, useLogout, useSwitchMembership } from "@/hooks/use-auth";
import { useRouter } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { createTenantSchema, slugify, type CreateTenantInput } from "@/lib/schemas";
import type { Membership, Role } from "@/lib/types";

/**
 * The space picker. Sign-in proves who you are; this is where you choose which of your centers
 * to work in. Spaces are grouped by what you are there (GitHub/Vercel style), searchable by name
 * or id, and a new space of your own starts here too.
 */
export default function SpacesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full max-w-2xl rounded-2xl" />}>
      <SpacesContent />
    </Suspense>
  );
}

/** Group order: the centers you run, then where you teach, then where you study. */
const GROUPS = ["TENANT_ADMIN", "TEACHER", "STUDENT"] as const;

/** Initial-letter mark colors, by role, so a glance tells the groups apart. */
const MARK: Record<Role, string> = {
  TENANT_ADMIN: "bg-secondary text-secondary-foreground",
  TEACHER: "bg-primary text-primary-foreground",
  STUDENT: "bg-accent text-accent-foreground",
  SUPER_ADMIN: "bg-foreground text-background",
};

function SpacesContent() {
  const { t } = useI18n();
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();
  const logout = useLogout();
  const switchTo = useSwitchMembership();
  const params = useSearchParams();
  const searchId = useId();
  // The sidebar's "new space" lands here with ?new=1.
  const [creating, setCreating] = useState(() => params.get("new") === "1");
  const [query, setQuery] = useState("");

  const memberships = useMemo(() => user?.memberships ?? [], [user?.memberships]);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = (m: Membership) => !q || m.tenant.name.toLowerCase().includes(q) || m.tenant.slug.toLowerCase().includes(q);
    return GROUPS.map((role) => ({ role, items: memberships.filter((m) => m.role === role && hit(m)) })).filter((g) => g.items.length > 0);
  }, [memberships, query]);

  if (isLoading || !user) return <Skeleton className="h-80 w-full max-w-2xl rounded-2xl" />;
  const busy = switchTo.isPending ? switchTo.variables : undefined;
  // The space the session is already in opens without another round trip.
  const open = (membershipId: string | null) => (membershipId === (user.membershipId ?? null) ? router.push("/dashboard") : switchTo.mutate(membershipId));
  const showPlatform = user.isPlatformAdmin && (!query.trim() || t("spaces.platform").toLowerCase().includes(query.trim().toLowerCase()));
  const nothing = groups.length === 0 && !showPlatform;

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">{t("spaces.title")}</h1>
        <p className="text-muted-foreground">{t("spaces.count", { count: memberships.length })}</p>
      </div>

      {/* Search earns its place once there are a few spaces; the groups alone carry two or three. */}
      {memberships.length > 3 && (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute inset-s-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor={searchId} className="sr-only">
            {t("spaces.search")}
          </label>
          <Input id={searchId} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("spaces.search")} className="ps-10" autoComplete="off" />
        </div>
      )}

      {showPlatform && (
        <Group title={t("spaces.groups.platform")} count={1}>
          <SpaceRow
            mark={<ShieldIcon className="size-4" />}
            markClass={MARK.SUPER_ADMIN}
            name={t("spaces.platform")}
            sub={t("spaces.platformDescription")}
            current={user.membershipId === null}
            busy={busy === null}
            onOpen={() => open(null)}
          />
        </Group>
      )}

      {groups.map((g) => (
        <Group key={g.role} title={t(`spaces.groups.${g.role}`)} count={g.items.length}>
          {g.items.map((m) => (
            <SpaceRow
              key={m.id}
              mark={<bdi>{m.tenant.name.trim().charAt(0)}</bdi>}
              markClass={MARK[m.role]}
              name={m.tenant.name}
              sub={
                <span dir="ltr" className="inline-block">
                  {m.tenant.slug}
                </span>
              }
              badge={
                m.status !== "ACTIVE" ? <AccountStatusBadge status={m.status} /> : !m.usable ? <Badge variant="outline">{t("spaces.unavailable")}</Badge> : undefined
              }
              current={m.id === user.membershipId}
              disabled={!m.usable}
              busy={busy === m.id}
              onOpen={() => open(m.id)}
            />
          ))}
        </Group>
      ))}

      {nothing && <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{t("spaces.noResults")}</p>}

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed px-4 py-3.5 text-start font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10" aria-hidden="true">
          <PlusIcon className="size-4" />
        </span>
        <span className="flex-1">{t("spaces.newSpace")}</span>
        <span className="text-xs font-normal text-muted-foreground">{t("spaces.trialNote")}</span>
      </button>

      <p className="text-center text-sm text-muted-foreground">
        <bdi dir="ltr">{user.email}</bdi>
        {" · "}
        <button type="button" onClick={logout} className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
          <LogOutIcon className="size-3.5" aria-hidden="true" /> {t("common.session.signOut")}
        </button>
      </p>

      <NewSpaceDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const { format } = useI18n();
  return (
    <section className="space-y-2">
      <h2 className="flex items-center justify-between px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <span>{title}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">{format.number(count)}</span>
      </h2>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">{children}</ul>
    </section>
  );
}

/** A whole row is the button: click anywhere to open the space. */
function SpaceRow({
  mark,
  markClass,
  name,
  sub,
  badge,
  current,
  disabled = false,
  busy,
  onOpen,
}: {
  mark: React.ReactNode;
  markClass: string;
  name: string;
  sub: React.ReactNode;
  badge?: React.ReactNode;
  current: boolean;
  disabled?: boolean;
  busy: boolean;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  return (
    <li>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={onOpen}
        className={cn(
          "group flex w-full items-center gap-3 px-4 py-3 text-start transition-colors",
          "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent",
        )}
      >
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold", markClass)} aria-hidden="true">
          {mark}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            <bdi>{name}</bdi>
          </span>
          <span className="block truncate text-xs text-muted-foreground">{sub}</span>
        </span>
        {current && <Badge variant="info">{t("spaces.current")}</Badge>}
        {badge}
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <>
              {t("spaces.open")}
              <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" aria-hidden="true" />
            </>
          )}
        </span>
      </button>
    </li>
  );
}

function NewSpaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const create = useCreateTenant();
  const form = useForm<CreateTenantInput>({ resolver: zodResolver(createTenantSchema), defaultValues: { tenantName: "", tenantSlug: "" } });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={form.handleSubmit((values) => create.mutate(createTenantSchema.parse(values)))} noValidate>
          <DialogHeader>
            <DialogTitle>{t("spaces.newSpace")}</DialogTitle>
            <DialogDescription>
              {t("spaces.newSpaceDescription")} {t("spaces.newSpaceDialog")}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="my-5">
            <TextField control={form.control} name="tenantName" label={t("auth.register.tenantName")} />
            <TextField
              control={form.control}
              name="tenantSlug"
              label={t("auth.register.tenantSlug")}
              dir="ltr"
              placeholder="alnoor-center"
              hint={t("auth.register.tenantSlugHint")}
              onChange={(e) => form.setValue("tenantSlug", slugify(e.target.value), { shouldValidate: form.formState.isSubmitted })}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2Icon className="animate-spin" />}
              {t("spaces.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
