const teachers = {
  title: "المدرسون",
  description: "إدارة حسابات المدرسين في المركز",
  create: "إضافة مدرس",
  emptyTitle: "لا يوجد مدرسون بعد",
  emptyText: "أضف أول مدرس ليتمكن من إنشاء كورساته وجدولة جلساته، أو أضف نفسك إن كنت تُدرّس بنفسك.",
  columns: {
    email: "البريد",
    courses: "الكورسات",
    students: "الطلاب",
    meetingAccounts: "حسابات الاجتماعات",
  },
  meeting: {
    accounts: { ZOOM: "Zoom", GOOGLE_MEET: "Google" },
    linked: "مربوط",
    missing: "غير مربوط",
    remind: "ذكّره بربط {provider}",
    reminded: "أرسلنا التذكير إلى المدرس",
    linkYours: "اربط حسابك من الإعدادات",
  },
  form: {
    passwordHint: "اختيارية: اتركها فارغة ليصل للمدرس بريد لاختيار كلمة المرور",
    subjects: "المواد (افصل بفاصلة)",
    subjectsPlaceholder: "رياضيات، فيزياء",
  },
  self: {
    add: "أضفني كمدرس",
    added: "أصبحت مدرسًا في المركز. اختر نفسك عند إنشاء الكورسات والجلسات.",
    badge: "أنت",
    removeText: "ستتوقف عن التدريس ولن تظهر في قائمة المدرسين. حسابك كمدير للمركز يبقى كما هو.",
  },
  actions: {
    report: "تقرير المدرس",
  },
};

export default teachers;
