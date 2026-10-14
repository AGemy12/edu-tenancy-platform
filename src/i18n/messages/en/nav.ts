import type { Shape } from "../../translate";
import type ar from "../ar/nav";

const nav: Shape<typeof ar> = {
  mainMenu: "Main menu",
  openMenu: "Open menu",
  menu: "Menu",
  platform: "Platform",
  home: "Home",
  teachers: "Teachers",
  students: "Students",
  courses: "Courses",
  sessions: "Sessions",
  schedules: "Monthly schedules",
  exams: "Exams",
  library: "Library",
  myFiles: "My files",
  reports: "Reports",
  billing: "Billing",
  settings: "Settings",
  platformAdmin: "Centers & subscriptions",
  platformPlans: "Packages",
  planUnlimited: "no end date",
  suspendedTitle: "Your account is suspended",
  suspendedText: "You can view your data, but adding, editing and sessions are paused until your center reactivates your account.",
  suspendedReason: "Reason:",
  expiredTitle: "The center's subscription has ended",
  expiredText: "You can browse your data, but adding, editing and starting sessions are paused until the subscription is renewed. Contact the platform team to renew.",
  expiredTextMember: "Adding, editing and sessions are paused until the center renews its subscription.",
  profile: "My profile",
  planBadge: "{plan} package · {remaining}",
  planName: "{plan} package",
  planEndsIn: { zero: "ends today", one: "ends in {count} day", other: "ends in {count} days" },
  planEnded: "period ended",
};

export default nav;
