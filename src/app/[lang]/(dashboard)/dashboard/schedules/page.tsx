"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import CrudPage from "@/components/crud-page";
import ScheduleDialog, { useDuration } from "@/components/schedules/schedule-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRowAction } from "@/hooks/use-resources";
import { useRouter } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import type { StudentSchedule } from "@/lib/types";
import { scheduleSchema } from "@/lib/schemas";

/** A YYYY-MM-DD calendar date as local midnight, `shift` days later. */
const day = (date: string, shift = 0) => {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() + shift);
  return d;
};

export default function SchedulesPage() {
  return (
    <Suspense>
      <Schedules />
    </Suspense>
  );
}

function Schedules() {
  const { t, format, locale } = useI18n();
  const duration = useDuration();
  const router = useRouter();
  // Arriving from the students page with ?student=<id> opens the form for that student.
  const studentParam = useSearchParams().get("student") ?? undefined;
  const [open, setOpen] = useState(Boolean(studentParam));
  const renew = useRowAction("/schedules", "renew", { successMessage: t("schedules.toast.renewed") });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next && studentParam) router.replace("/dashboard/schedules");
  }

  // Saturday-first in Arabic, Sunday-first in English, matching the weekday picker.
  const dayRank = (d: number) => (locale === "ar" ? (d + 1) % 7 : d);
  const slotLabel = (s: StudentSchedule["slots"][number]) =>
    t("schedules.slot", { day: format.weekday(s.weekday), time: format.time(`2000-01-01T${s.startTime}`) });

  return (
    <>
      <CrudPage<StudentSchedule>
        title={t("schedules.title")}
        description={t("schedules.description")}
        endpoint="/schedules"
        canCreate={false}
        extraActions={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon data-icon="inline-start" /> {t("schedules.create")}
          </Button>
        }
        emptyTitle={t("schedules.emptyTitle")}
        emptyText={t("schedules.emptyText")}
        rowLabel={(r) => `${r.title} · ${r.student.user.fullName}`}
        deleteText={() => t("schedules.deleteText")}
        // Creating goes through the dialog above; CrudPage's own form is never shown.
        schema={scheduleSchema}
        fields={[]}
        columns={[
          { key: "student.user.fullName", label: t("fields.student"), className: "font-semibold" },
          { key: "title", label: t("fields.sessionTitle"), className: "hidden sm:table-cell" },
          { key: "teacher.user.fullName", label: t("fields.teacher"), className: "hidden lg:table-cell" },
          {
            key: "period",
            label: t("schedules.columns.period"),
            render: (r) => (
              <span className="whitespace-nowrap tabular-nums">
                {t("schedules.periodRange", { from: format.date(day(r.startDate)), to: format.date(day(r.endDate, -1)) })}
              </span>
            ),
          },
          {
            key: "hours",
            label: t("schedules.columns.hours"),
            render: (r) => (
              <div className="space-y-0.5">
                <p className="whitespace-nowrap font-medium">
                  {t("schedules.hoursProgress", { done: duration(r.stats.completedMinutes), monthly: duration(r.monthlyMinutes) })}
                </p>
                <p className="whitespace-nowrap text-xs text-muted-foreground">
                  {t("schedules.hoursBooked", { scheduled: duration(r.stats.scheduledMinutes) })}
                </p>
              </div>
            ),
          },
          {
            key: "slots",
            label: t("schedules.columns.slots"),
            className: "hidden md:table-cell",
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                {[...r.slots]
                  .sort((a, b) => dayRank(a.weekday) - dayRank(b.weekday) || a.startTime.localeCompare(b.startTime))
                  .map((s) => (
                    <Badge key={`${s.weekday}-${s.startTime}`} variant="secondary" className="whitespace-nowrap">
                      {slotLabel(s)}
                    </Badge>
                  ))}
              </div>
            ),
          },
          {
            key: "stats.upcoming",
            label: t("schedules.columns.upcoming"),
            render: (r) => <span className="tabular-nums">{format.number(r.stats.upcoming)}</span>,
          },
          {
            key: "provider",
            label: t("fields.platform"),
            className: "hidden",
            render: (r) => <Badge variant="outline">{t(`sessions.provider.${r.provider}`)}</Badge>,
          },
          { key: "course.title", label: t("fields.course"), className: "hidden" },
        ]}
        rowActions={(r) => [
          { label: t("schedules.actions.renew"), icon: RefreshCwIcon, onClick: () => renew.mutate({ id: r.id }) },
        ]}
      />
      <ScheduleDialog open={open} onOpenChange={onOpenChange} studentId={studentParam} />
    </>
  );
}
