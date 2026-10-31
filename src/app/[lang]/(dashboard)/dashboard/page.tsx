"use client";

import { useEffect } from "react";
import { BookOpenIcon, ClipboardCheckIcon, GraduationCapIcon, UsersIcon, VideoIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useStats } from "@/hooks/use-resources";
import { Link, useRouter } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const TILES = [
  { key: "students", icon: UsersIcon, tone: "bg-secondary text-secondary-foreground", href: "/dashboard/students" },
  { key: "teachers", icon: GraduationCapIcon, tone: "bg-info/12 text-info", href: "/dashboard/teachers" },
  { key: "courses", icon: BookOpenIcon, tone: "bg-highlight/20 text-highlight-foreground dark:text-highlight", href: "/dashboard/courses" },
  { key: "upcomingSessions", icon: VideoIcon, tone: "bg-destructive/10 text-destructive dark:bg-destructive/20", href: "/dashboard/sessions" },
  { key: "openExams", icon: ClipboardCheckIcon, tone: "bg-success/15 text-success", href: "/dashboard/exams" },
] as const;

export default function DashboardHome() {
  const { t, format } = useI18n();
  const { user } = useCurrentUser();
  const router = useRouter();
  const isPlatform = user?.role === "SUPER_ADMIN";
  const stats = useStats(!isPlatform);

  useEffect(() => {
    if (isPlatform) router.replace("/dashboard/platform");
  }, [isPlatform, router]);
  if (isPlatform) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t("dashboard.greeting", { name: user?.fullName ?? "" })} 👋</h1>
          <p className="text-muted-foreground">{t("dashboard.overview", { tenant: user?.tenant?.name ?? "" })}</p>
        </div>
        {user?.role !== "STUDENT" && (
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/dashboard/sessions">
                <VideoIcon /> {t("dashboard.actions.scheduleSession")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/students">
                <UsersIcon /> {t("dashboard.actions.addStudent")}
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {TILES.map((tile) => {
          const value = stats.data?.[tile.key];
          return (
            <Link key={tile.key} href={tile.href} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-soft">
                <CardContent className="flex flex-col gap-3 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{t(`dashboard.stats.${tile.key}`)}</span>
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tile.tone)}>
                      <tile.icon className="size-4.5" aria-hidden="true" />
                    </span>
                  </div>
                  {stats.isPending ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <span className="text-3xl font-bold tabular-nums">{value == null ? "—" : format.number(value)}</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
