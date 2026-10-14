import { plural } from "../../translate";

/** The spaces (centers) an account belongs to: the picker after sign-in and the sidebar switcher. */
const spaces = {
  title: "مساحاتك",
  description: "كل مركز أو حساب تدريس أنت عضو فيه بأي دور. اختر ما تريد فتحه.",
  count: plural({
    zero: "لا توجد مساحات على حسابك بعد",
    one: "مساحة واحدة على حسابك",
    two: "مساحتان على حسابك",
    few: "{count} مساحات على حسابك",
    many: "{count} مساحة على حسابك",
    other: "{count} مساحة على حسابك",
  }),
  search: "ابحث باسم المركز أو معرّفه…",
  noResults: "لا توجد مساحة بهذا الاسم.",
  groups: {
    platform: "المنصة",
    TENANT_ADMIN: "تديرها",
    TEACHER: "تدرّس فيها",
    STUDENT: "تدرس فيها",
  },
  open: "فتح",
  current: "آخر ما فتحت",
  unavailable: "غير متاح الآن",
  switcherLabel: "المساحات",
  all: "كل المساحات",
  platform: "لوحة المنصة",
  platformDescription: "إدارة المراكز والاشتراكات على مستوى المنصة.",
  newSpace: "إنشاء مساحة جديدة",
  trialNote: "تجربة مجانية 14 يوماً",
  newSpaceDescription: "ابدأ مركزاً أو حساب تدريس خاصاً بك بنفس تسجيل الدخول، مع تجربة مجانية 14 يوماً. تجربة واحدة في الوقت نفسه، وحد أقصى لعدد المساحات لكل حساب.",
  newSpaceDialog: "تُضاف المساحة إلى حسابك وتصبح مديرها، وتُفتح لك مباشرة.",
  create: "إنشاء",
  switched: "فتحت {name}",
  signedInAs: "مسجّل الدخول بـ {email}",
};

export default spaces;
