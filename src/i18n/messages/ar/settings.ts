const settings = {
  title: "الإعدادات",
  center: {
    title: "بيانات المركز",
    description: "الاسم الذي يظهر لمدرسيك وطلابك، والتوقيت والعملة المستخدمان في الجداول والحسابات.",
    name: "اسم المركز",
    timezone: "المنطقة الزمنية",
    timezoneHint: "مواعيد الجداول الشهرية تُحسب بها",
    currency: "العملة",
    currencyHint: "تُعرض بها أسعار الجلسات والحسابات",
    saved: "تم حفظ بيانات المركز",
  },
  integrations: "ربط حسابات الاجتماعات",
  integrationsDescription: "اربط حسابك على منصة الاجتماعات لتُنشأ روابط الجلسات تلقائياً.",
  unavailable: "غير متاح",
  connected: "متصل",
  disconnect: "فصل الحساب",
  connectFailed: "تعذر بدء الربط",
  disconnectFailed: "تعذر الفصل",
  notConfigured: "غير مُفعّل على المنصة بعد، تواصل مع إدارة المنصة",
  google: {
    description: "اربط حساب Google الخاص بك لإنشاء جلسات Google Meet تلقائياً على تقويمك.",
    connect: "ربط حساب Google",
    connectSuccess: "تم ربط حساب Google بنجاح.",
    connectError: "فشل ربط حساب Google، حاول مرة أخرى.",
    disconnected: "تم فصل حساب Google",
  },
  zoom: {
    description:
      "اربط حساب Zoom الخاص بك لإنشاء اجتماع لكل جلسة تلقائياً. الاجتماعات تُنشأ على حسابك وبرخصتك، والتسجيلات تُحفظ عندك.",
    connect: "ربط حساب Zoom",
    connectSuccess: "تم ربط حساب Zoom بنجاح.",
    connectError: "فشل ربط حساب Zoom، حاول مرة أخرى.",
    disconnected: "تم فصل حساب Zoom",
  },
};

export default settings;
