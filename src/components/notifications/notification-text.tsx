"use client";

import { useCallback } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BanIcon,
  Building2Icon,
  CalendarClockIcon,
  CalendarX2Icon,
  ClipboardCheckIcon,
  FolderOpenIcon,
  LifeBuoyIcon,
  LinkIcon,
  MegaphoneIcon,
  PauseCircleIcon,
  RadioIcon,
  ShieldCheckIcon,
  StarIcon,
  UserPlusIcon,
  UsersIcon,
  VideoIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";
import type { Params } from "@/i18n/translate";
import type { AppNotification, NotificationCategory, NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Wraps a value (a name, a title) in Unicode isolates, so Arabic inside an English sentence (or
 * the reverse) keeps its own direction without reordering the sentence around it. Works in plain
 * strings too: toasts, desktop alerts, the tab title.
 */
export const isolate = (value: string) => `\u2068${value}\u2069`;

/** Title and body of a notification in the page's language, with its dates written for the reader. */
export function useNotificationText() {
  const { t, has, format, locale } = useI18n();
  return useCallback(
    (n: AppNotification) => {
      const p = n.params ?? {};
      const values: Params = {};
      const suffix = locale === "ar" ? "Ar" : "En";
      for (const [key, value] of Object.entries(p)) {
        // A package name comes in both languages (planAr, planEn).
        if (/[a-z](Ar|En)$/.test(key)) {
          if (key.endsWith(suffix)) values[key.slice(0, -2)] = value;
          continue;
        }
        if (typeof value === "string" && DATE_TIME.test(value)) values[key] = key === "end" ? format.longDate(value) : format.dateTime(value);
        else if (typeof value === "string" && DAY.test(value)) values[key] = format.dayUtc(value);
        else values[key] = typeof value === "string" ? isolate(value) : value;
      }
      // Plural texts count whichever number the type carries.
      values.count = Number(p.count ?? p.minutes ?? p.days ?? p.hours ?? 0);

      // The center owner's copy of something that happened to others is told in the third person.
      const base = `notifications.${n.oversight ? "oversight" : "types"}.${n.type}${typeof p.variant === "string" ? `.${p.variant}` : ""}`;
      const text = (part: "title" | "body") => (has(`${base}.${part}`) ? t(`${base}.${part}` as MessageKey, values) : "");
      const source =
        n.type === "ANNOUNCEMENT" && typeof p.variant === "string" && has(`notifications.announcementFrom.${p.variant}`)
          ? t(`notifications.announcementFrom.${p.variant}` as MessageKey, values)
          : null;
      return {
        title: text("title") || n.type,
        body: text("body"),
        /** Who it is from, for announcements. */
        source,
        reason: typeof p.reason === "string" && p.reason ? t("notifications.reason", { reason: p.reason }) : null,
        /** Who did it, on the owner's copies. */
        byline: n.oversight && n.actor ? t("notifications.by", { name: isolate(n.actor.fullName) }) : null,
      };
    },
    [t, has, format, locale],
  );
}

type Tone = "primary" | "success" | "warning" | "danger" | "info";

const TYPE_ICONS: Partial<Record<NotificationType, [LucideIcon, Tone]>> = {
  SESSION_SCHEDULED: [CalendarClockIcon, "primary"],
  SESSION_RESCHEDULED: [CalendarClockIcon, "warning"],
  SESSION_CANCELED: [CalendarX2Icon, "danger"],
  SESSION_LIVE: [RadioIcon, "success"],
  SESSION_REMINDER: [VideoIcon, "info"],
  SESSION_EVALUATED: [StarIcon, "primary"],
  SCHEDULE_CREATED: [CalendarClockIcon, "primary"],
  EXAM_PUBLISHED: [ClipboardCheckIcon, "primary"],
  EXAM_GRADED: [ClipboardCheckIcon, "success"],
  FILES_SHARED: [FolderOpenIcon, "info"],
  TEACHER_ASSIGNED: [UsersIcon, "primary"],
  STUDENT_ASSIGNED: [UsersIcon, "primary"],
  SUBSCRIPTION_CHANGED: [WalletIcon, "primary"],
  SUBSCRIPTION_EXPIRING: [AlertTriangleIcon, "warning"],
  SUBSCRIPTION_EXPIRED: [AlertTriangleIcon, "danger"],
  SUPPORT_REQUESTED: [LifeBuoyIcon, "warning"],
  SUPPORT_DECIDED: [LifeBuoyIcon, "info"],
  TENANT_REGISTERED: [Building2Icon, "success"],
  ANNOUNCEMENT: [MegaphoneIcon, "primary"],
  MEMBER_ADDED: [UserPlusIcon, "success"],
  MEETING_ACCOUNT_NEEDED: [LinkIcon, "warning"],
};

const CATEGORY_ICONS: Record<NotificationCategory, LucideIcon> = {
  SESSIONS: VideoIcon,
  EXAMS: ClipboardCheckIcon,
  LIBRARY: FolderOpenIcon,
  PEOPLE: UsersIcon,
  ACCOUNT: ShieldCheckIcon,
  SUBSCRIPTION: WalletIcon,
  SUPPORT: LifeBuoyIcon,
  PLATFORM: Building2Icon,
  ANNOUNCEMENTS: MegaphoneIcon,
  ACTIVITY: ActivityIcon,
};

const TONES: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground dark:text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

export function categoryIcon(category: NotificationCategory) {
  return CATEGORY_ICONS[category];
}

/** The round icon of a notification, colored by what it means (good news, warning, bad news). */
export function NotificationIcon({ notification, className }: { notification: AppNotification; className?: string }) {
  let [Icon, tone] = TYPE_ICONS[notification.type] ?? [CATEGORY_ICONS[notification.category], "primary" as Tone];
  if (notification.type === "ACCOUNT_STATUS") {
    const variant = notification.params.variant;
    [Icon, tone] = variant === "BLOCKED" ? [BanIcon, "danger"] : variant === "SUSPENDED" ? [PauseCircleIcon, "warning"] : [ShieldCheckIcon, "success"];
  }
  if (notification.type === "SUPPORT_DECIDED" && notification.params.variant === "DENIED") tone = "danger";
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TONES[tone], className)} aria-hidden="true">
      <Icon className="size-4.5" />
    </span>
  );
}
