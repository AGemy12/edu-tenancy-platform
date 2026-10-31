"use client";

import { AlertTriangleIcon, BellRingIcon, LinkIcon, Loader2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import { useIntegrations, useList, useRowAction } from "@/hooks/use-resources";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";
import { isolate } from "@/components/notifications/notification-text";
import type { Teacher } from "@/lib/types";

export type HostedProvider = "ZOOM" | "GOOGLE_MEET";

export const isHosted = (provider: string): provider is HostedProvider => provider === "ZOOM" || provider === "GOOGLE_MEET";

/** The `IntegrationStatus` / `meetingAccounts` key of the account a provider's sessions run on. */
export const accountKey = (provider: HostedProvider) => (provider === "ZOOM" ? "zoom" : "google");

/** POST /teachers/:id/meeting-reminder: only the teacher can link the account their sessions run on. */
export function useMeetingReminder() {
  const { t } = useI18n();
  return useRowAction("/teachers", "meeting-reminder", { successMessage: t("teachers.meeting.reminded") });
}

/**
 * Warns before booking a Zoom or Meet session whose teacher hasn't linked that account: the
 * meeting is created on the teacher's own account, so the API would refuse it. The teacher is
 * sent to settings; an admin can pick a pasted link instead, or remind the teacher.
 */
export function MeetingAccountNotice({ provider, teacherId }: { provider: string; teacherId?: string }) {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const isTeacher = user?.role === "TEACHER";
  const status = useIntegrations();
  // Same query key as the teacher select, so this reads the cached list.
  const teachers = useList<Teacher>("/teachers", !isTeacher && Boolean(teacherId));
  const remind = useMeetingReminder();

  if (!isHosted(provider) || !status.data) return null;
  const key = accountKey(provider);
  const account = t(`teachers.meeting.accounts.${provider}`);

  if (!status.data[key].configured) {
    return <Notice>{t("sessions.form.meetingAccount.disabled", { provider: account })}</Notice>;
  }

  const teacher = teachers.data?.find((x) => x.id === teacherId);
  // A teacher books for themselves; so does an admin who picks their own teacher profile.
  if (isTeacher || (teacher && teacher.user.id === user?.id)) {
    if (status.data[key].account) return null;
    return (
      <Notice
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/settings">
              <LinkIcon data-icon="inline-start" /> {t("sessions.form.meetingAccount.linkNow")}
            </Link>
          </Button>
        }
      >
        {t("sessions.form.meetingAccount.selfMissing", { provider: account })}
      </Notice>
    );
  }

  if (!teacher?.meetingAccounts || teacher.meetingAccounts[key]) return null;
  return (
    <Notice
      action={
        <Button type="button" size="sm" variant="outline" disabled={remind.isPending} onClick={() => remind.mutate({ id: teacher.id, body: { provider } })}>
          {remind.isPending ? <Loader2Icon className="animate-spin" /> : <BellRingIcon data-icon="inline-start" />}
          {t("teachers.meeting.remind", { provider: account })}
        </Button>
      }
    >
      {t("sessions.form.meetingAccount.teacherMissing", { name: isolate(teacher.user.fullName), provider: account })}
    </Notice>
  );
}

function Notice({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Alert className="sm:col-span-2">
      <AlertTriangleIcon aria-hidden="true" className="text-warning" />
      <AlertDescription className="space-y-2">
        <p>{children}</p>
        {action}
      </AlertDescription>
    </Alert>
  );
}
