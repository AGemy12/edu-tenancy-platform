"use client";

import { useEffect } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useI18n, useT } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SpaceSwitcher } from "@/components/space-switcher";
import { SupportBanner } from "@/components/support-banner";
import { useSupportAccess } from "@/components/settings/support-access";
import {
  AlertTriangleIcon,
  PauseCircleIcon,
  BarChart3Icon,
  BookOpenIcon,
  Building2Icon,
  CalendarClockIcon,
  ClipboardCheckIcon,
  FolderOpenIcon,
  GraduationCapIcon,
  LibraryBigIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MessagesSquareIcon,
  MenuIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersIcon,
  VideoIcon,
  WalletIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { useTenantMe } from "@/hooks/use-resources";
import { useAuthStore } from "@/stores/auth-store";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { RealtimeBridge } from "@/components/realtime/realtime-bridge";
import { canUseMessages, useChatUnread } from "@/hooks/use-messages";
import type { AuthUser, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: MessageKey; icon: typeof UsersIcon; roles: Role[] }[] = [
  { href: "/dashboard", label: "nav.home", icon: LayoutDashboardIcon, roles: ["TENANT_ADMIN", "TEACHER", "STUDENT"] },
  { href: "/dashboard/messages", label: "nav.messages", icon: MessagesSquareIcon, roles: ["TENANT_ADMIN", "TEACHER", "STUDENT"] },
  { href: "/dashboard/teachers", label: "nav.teachers", icon: GraduationCapIcon, roles: ["TENANT_ADMIN"] },
  { href: "/dashboard/students", label: "nav.students", icon: UsersIcon, roles: ["TENANT_ADMIN", "TEACHER"] },
  { href: "/dashboard/courses", label: "nav.courses", icon: BookOpenIcon, roles: ["TENANT_ADMIN", "TEACHER", "STUDENT"] },
  { href: "/dashboard/sessions", label: "nav.sessions", icon: VideoIcon, roles: ["TENANT_ADMIN", "TEACHER", "STUDENT"] },
  { href: "/dashboard/schedules", label: "nav.schedules", icon: CalendarClockIcon, roles: ["TENANT_ADMIN", "TEACHER"] },
  { href: "/dashboard/exams", label: "nav.exams", icon: ClipboardCheckIcon, roles: ["TENANT_ADMIN", "TEACHER", "STUDENT"] },
  { href: "/dashboard/library", label: "nav.library", icon: LibraryBigIcon, roles: ["TENANT_ADMIN", "TEACHER"] },
  { href: "/dashboard/library", label: "nav.myFiles", icon: FolderOpenIcon, roles: ["STUDENT"] },
  { href: "/dashboard/billing", label: "nav.billing", icon: WalletIcon, roles: ["TENANT_ADMIN", "TEACHER", "STUDENT"] },
  { href: "/dashboard/reports", label: "nav.reports", icon: BarChart3Icon, roles: ["TENANT_ADMIN", "TEACHER", "STUDENT"] },
  { href: "/dashboard/settings", label: "nav.settings", icon: SettingsIcon, roles: ["TENANT_ADMIN", "TEACHER"] },
  { href: "/dashboard/platform", label: "nav.home", icon: LayoutDashboardIcon, roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/platform/centers", label: "nav.platformAdmin", icon: Building2Icon, roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/platform/plans", label: "nav.platformPlans", icon: WalletIcon, roles: ["SUPER_ADMIN"] },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join(" ");
}

function NavLinks({ user, onNavigate }: { user: AuthUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t, format } = useI18n();
  const chat = canUseMessages(user);
  const unreadMessages = useChatUnread(chat).data?.messages ?? 0;
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label={t("nav.mainMenu")}>
      {/* Messages are a member's own: hidden in support mode. */}
      {NAV.filter((n) => n.roles.includes(user.role) && (n.href !== "/dashboard/messages" || chat)).map((n) => {
        // The two home entries sit above their sections, so they match exactly.
        const active = n.href === "/dashboard" || n.href === "/dashboard/platform" ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <n.icon className="size-4.5" aria-hidden="true" />
            <span className="flex-1">{t(n.label)}</span>
            {n.href === "/dashboard/messages" && unreadMessages > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[0.7rem] font-bold text-primary-foreground" aria-label={t("chat.unreadCount", { count: unreadMessages })}>
                {format.number(Math.min(unreadMessages, 99))}
                {unreadMessages > 99 && "+"}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until `iso` (rounded up), -1 once it has passed, null when unknown. */
function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  return diff < 0 ? -1 : Math.ceil(diff / DAY_MS);
}

/** The center's package and what is left of the current period (hidden until known). */
function PlanBadge({ user }: { user: AuthUser }) {
  const { t, rich, locale } = useI18n();
  // GET /tenants/me is open to every tenant role, but not to the platform super admin.
  const tenant = useTenantMe(user.role !== "SUPER_ADMIN" && Boolean(user.tenantId));
  const sub = tenant.data?.subscription;
  if (!sub?.plan || typeof sub.plan !== "object") return null;

  const name = (locale === "ar" ? sub.plan.nameAr : sub.plan.nameEn) || sub.plan.code;
  const plan = (
    <span className="font-semibold">
      <bdi>{name}</bdi>
    </span>
  );
  const days = daysUntil(sub.currentPeriodEnd);
  // A package granted for good has no end date.
  const remaining = sub.currentPeriodEnd === null ? t("nav.planUnlimited") : days === null ? null : days < 0 ? t("nav.planEnded") : t("nav.planEndsIn", { count: days });
  return (
    <div className="border-t p-3 text-xs text-muted-foreground">
      <div className="rounded-xl bg-sidebar-accent px-3 py-2 text-sidebar-accent-foreground">
        {remaining === null ? rich("nav.planName", { plan }) : rich("nav.planBadge", { plan, remaining })}
      </div>
    </div>
  );
}

/** Shown on every page while the center's subscription has lapsed (the API then only allows reads). */
/** A suspended member can look but not touch; tell them, and why. */
function SuspendedBanner({ user }: { user: AuthUser }) {
  const t = useT();
  if (user.status !== "SUSPENDED") return null;
  return (
    <Alert className="mb-6 border-warning/50 bg-warning/10">
      <PauseCircleIcon className="text-warning-foreground dark:text-warning" />
      <AlertTitle>{t("nav.suspendedTitle")}</AlertTitle>
      <AlertDescription>
        <p>{t("nav.suspendedText")}</p>
        {user.statusReason && (
          <p>
            {t("nav.suspendedReason")} <bdi>{user.statusReason}</bdi>
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

/** A center admin learns on every page that platform support is waiting for their answer. */
function SupportRequestBanner({ user }: { user: AuthUser }) {
  const t = useT();
  const pathname = usePathname();
  const access = useSupportAccess(user.role === "TENANT_ADMIN" && !user.support);
  const pending = access.data?.filter((r) => r.state === "PENDING").length ?? 0;
  // The settings page shows the requests themselves.
  if (!pending || pathname.startsWith("/dashboard/settings")) return null;
  return (
    <Alert className="mb-6 border-warning/50 bg-warning/10">
      <LifeBuoyIcon className="text-warning-foreground dark:text-warning" />
      <AlertTitle>{t("support.access.bannerTitle", { count: pending })}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{t("support.access.bannerText")}</span>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/settings#support">{t("support.access.review")}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function ExpiredBanner({ user }: { user: AuthUser }) {
  const t = useT();
  const tenant = useTenantMe(user.role !== "SUPER_ADMIN" && Boolean(user.tenantId));
  if (!tenant.data?.subscriptionExpired) return null;
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangleIcon />
      <AlertTitle>{t("nav.expiredTitle")}</AlertTitle>
      <AlertDescription>{user.role === "TENANT_ADMIN" ? t("nav.expiredText") : t("nav.expiredTextMember")}</AlertDescription>
    </Alert>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const clearSession = useAuthStore((s) => s.clear);
  const { t, dir } = useI18n();
  const sessionEnded = !isLoading && !user;

  // No tokens left (expired refresh, or a new tab without "remember me") but the
  // session cookie may still be set — and the proxy bounces /login back here while
  // it exists. Drop the stale session first, then go to the login page.
  useEffect(() => {
    if (!sessionEnded) return;
    clearSession();
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [sessionEnded, clearSession, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-e bg-sidebar p-5 md:block">
          <Skeleton className="h-9 w-40" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </aside>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-64" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-semibold">{t("common.session.ended")}</p>
        <p className="text-sm text-muted-foreground">{t("common.session.signInAgain")}</p>
        <Button asChild>
          <Link href="/login" onClick={clearSession}>
            {t("common.session.signIn")}
          </Link>
        </Button>
      </div>
    );
  }

  const userMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto gap-3 px-2 py-1.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-start sm:block">
            <span className="block text-sm font-semibold leading-tight"><bdi>{user.fullName}</bdi></span>
            <span className="block text-xs text-muted-foreground">{t(`common.roles.${user.role}`)}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate"><bdi>{user.fullName}</bdi></div>
          <div className="truncate text-xs font-normal text-muted-foreground" dir="ltr">
            {user.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">
            <UserRoundIcon /> {t("nav.profile")}
          </Link>
        </DropdownMenuItem>
        {user.role !== "STUDENT" && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <SettingsIcon /> {t("nav.settings")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOutIcon /> {user.support ? t("support.exit") : t("common.session.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e bg-sidebar md:flex">
        <SpaceSwitcher user={user} />
        <div className="flex-1 overflow-y-auto">
          <NavLinks user={user} />
        </div>
        <PlanBadge user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Support mode keeps its banner in view above the header. */}
        <div className="sticky top-0 z-20">
          <SupportBanner user={user} />
          <header className="flex h-16 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden" aria-label={t("nav.openMenu")}>
                    <MenuIcon />
                  </Button>
                </SheetTrigger>
                <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-72 p-0">
                  <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
                  <SpaceSwitcher user={user} />
                  <NavLinks user={user} />
                </SheetContent>
              </Sheet>
              <span className="font-bold md:hidden"><bdi>{user.tenant?.name}</bdi></span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationBell user={user} />
              <LocaleSwitcher />
              <ThemeToggle />
              {userMenu}
            </div>
          </header>
        </div>
        <main className="flex-1 p-4 md:p-8">
          <RealtimeBridge user={user} />
          <SuspendedBanner user={user} />
          <ExpiredBanner user={user} />
          <SupportRequestBanner user={user} />
          {children}
        </main>
      </div>
    </div>
  );
}
