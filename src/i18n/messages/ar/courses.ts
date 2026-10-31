import { plural } from "../../translate";

const courses = {
  title: "الكورسات",
  description: "الكورسات التي يقدمها المدرسون",
  create: "إضافة كورس",
  emptyTitle: "لا توجد كورسات بعد",
  emptyText: "أنشئ كورساً واربطه بمدرس، ثم سجّل فيه الطلاب.",
  priceValue: "{amount} ج.م",
  columns: {
    enrolled: "المسجلون",
  },
  form: {
    level: "المستوى / الصف",
    price: "السعر (ج.م)",
  },
  enrollments: {
    title: "طلاب الكورس",
    add: "إضافة طالب",
    addLabel: "اختر طالباً لإضافته",
    noneLeft: "كل طلابك مسجلون في هذا الكورس",
    empty: "لا يوجد طلاب مسجلون بعد",
    emptyHint: "أضف الطلاب ليظهر لهم الكورس وامتحاناته، وتُضاف جلساته إليهم تلقائياً.",
    count: plural({
      zero: "لا طلاب",
      one: "طالب واحد",
      two: "طالبان",
      few: "{count} طلاب",
      many: "{count} طالباً",
      other: "{count} طالب",
    }),
    remove: "إزالة {name} من الكورس",
    added: "تمت إضافة الطالب",
    removed: "تمت إزالة الطالب",
  },
  actions: {
    students: "طلاب الكورس",
    report: "تقرير الكورس",
    deactivate: "إيقاف الكورس",
    activate: "تفعيل الكورس",
  },
};

export default courses;
