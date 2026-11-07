const teachers = {
  title: "المدرسون",
  description: "إدارة حسابات المدرسين في المركز",
  create: "إضافة مدرس",
  emptyTitle: "لا يوجد مدرسون بعد",
  emptyText: "أضف أول مدرس ليتمكن من إنشاء كورساته وجدولة حصصه، أو أضف نفسك إن كنت تُدرّس بنفسك.",
  columns: {
    email: "البريد",
    courses: "الكورسات",
    students: "الطلاب",
    meetingAccounts: "حسابات الاجتماعات",
    pay: "أجر الحصة",
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
    passwordEditHint: "اتركها فارغة لتبقى الحالية. كلمة المرور الجديدة تُخرج المدرس من كل أجهزته",
    passwordHint: "اختيارية: اتركها فارغة ليصل للمدرس بريد لاختيار كلمة المرور",
    payHint: "بعملة المركز ({currency}) للمبلغ الثابت، أو من 0 إلى 100 للنسبة. اتركه فارغاً إن لم يُحدد بعد.",
    subjects: "المواد (افصل بفاصلة)",
    subjectsPlaceholder: "رياضيات، فيزياء",
  },
  self: {
    add: "أضفني كمدرس",
    added: "أصبحت مدرسًا في المركز. اختر نفسك عند إنشاء الكورسات والحصص.",
    badge: "أنت",
    removeText: "ستتوقف عن التدريس ولن تظهر في قائمة المدرسين. حسابك كمدير للمركز يبقى كما هو.",
  },
  actions: {
    report: "تقرير المدرس",
  },
};

export default teachers;
