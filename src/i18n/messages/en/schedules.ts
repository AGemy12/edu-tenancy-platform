import type { Shape } from "../../translate";
import type ar from "../ar/schedules";

const schedules: Shape<typeof ar> = {
  title: "Monthly schedules",
  description: "Set a student's monthly hours and weekly time slots, and the whole month's sessions are created for you",
  create: "New monthly schedule",
  emptyTitle: "No monthly schedules",
  emptyText: "Enter a student's hours for the month and their weekly days and times, and we'll create every session of the month.",
  columns: {
    period: "Period",
    hours: "Hours",
    slots: "Time slots",
    upcoming: "Upcoming sessions",
  },
  periodRange: "{from} – {to}",
  hoursProgress: "{done} of {monthly}",
  hoursBooked: "{scheduled} scheduled",
  slot: "{day} {time}",
  form: {
    description: "Enter the hours and time slots, then review the sessions before saving",
    titlePlaceholder: "e.g. Math – private lessons",
    monthlyHint: "The student's total hours for the month",
    weeklyHint: "Split evenly across the weekly time slots",
    startDateHint: "The period runs one month from this date",
    slots: "Weekly days and times",
    slotsHint: "Pick the day and the session's start time, in the center's timezone",
    addSlot: "Add a day",
    removeSlot: "Remove time slot",
    sessionLength: "Each session lasts {duration}",
    save: { zero: "Create sessions", one: "Create {count} session", other: "Create {count} sessions" },
  },
  preview: {
    title: "Session preview",
    hint: "Fill in the hours and time slots to see the month's sessions",
    loading: "Working out the sessions…",
    summary: "{sessions} · {hours}",
    shortfall:
      "These time slots only cover {scheduled} of {monthly} in this period. Add a day or raise the weekly hours to cover the rest.",
    conflicts: {
      zero: "No clashes",
      one: "{count} session clashes with another session of the teacher or student",
      other: "{count} sessions clash with other sessions of the teacher or student",
    },
    conflictsBlock: "A teacher or student can't be in two sessions at once. Change the days or times to save.",
    conflict: "Clash",
    shorter: "Shorter, to finish the package",
  },
  sessions: { zero: "No sessions", one: "{count} session", other: "{count} sessions" },
  duration: {
    hours: { one: "{count} hour", other: "{count} hours" },
    minutes: { one: "{count} minute", other: "{count} minutes" },
    hoursMinutes: "{hours} {minutes}",
  },
  actions: {
    renew: "Renew for next month",
  },
  deleteText: "The schedule and all its upcoming sessions will be deleted. Sessions already held stay in the records and billing.",
  toast: {
    created: { zero: "Schedule saved", one: "{count} session created", other: "{count} sessions created" },
    renewed: "Schedule renewed for next month",
  },
};

export default schedules;
