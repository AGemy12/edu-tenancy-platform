const exams = {
  title: "الامتحانات الشهرية",
  description: "امتحانات يضعها المدرس لكل كورس شهرياً",
  create: "إضافة امتحان",
  emptyTitle: "لا توجد امتحانات بعد",
  emptyText: "أنشئ امتحاناً شهرياً لكورس، ثم ارصد درجات الطلاب.",
  columns: {
    results: "النتائج",
    myScore: "درجتي",
  },
  myScore: "{score} من {total}",
  notGraded: "لم تُرصد بعد",
  grading: {
    title: "رصد الدرجات",
    description: "{course} · الدرجة الكلية {total}",
    student: "الطالب",
    score: "الدرجة",
    feedback: "ملاحظة",
    feedbackPlaceholder: "اختياري",
    empty: "لا يوجد طلاب مسجلون في هذا الكورس",
    emptyHint: "سجّل الطلاب في الكورس أولاً من صفحة الكورسات.",
    outOf: "من {total}",
    invalid: "الدرجة بين 0 و {total}",
    saved: "تم حفظ الدرجات",
  },
  form: {
    monthHint: "أي يوم داخل الشهر المطلوب",
  },
  status: {
    DRAFT: "مسودة",
    PUBLISHED: "منشور",
    CLOSED: "مغلق",
  },
  actions: {
    grade: "رصد الدرجات",
    publish: "نشر الامتحان",
    close: "إغلاق الامتحان",
  },
};

export default exams;
