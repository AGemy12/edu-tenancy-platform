/** Sign-in, sign-up and password recovery pages. */
const auth = {
  login: {
    title: "تسجيل الدخول",
    description: "أهلاً بعودتك، أدخل بريدك وكلمة المرور للمتابعة.",
    rememberMe: "تذكرني",
    forgotPassword: "نسيت كلمة المرور؟",
    submit: "دخول",
    noAccount: "ليس لديك حساب؟",
    createCenter: "أنشئ مركزك الآن",
  },
  register: {
    title: "إنشاء مركز جديد",
    description: "سيتم إنشاء حساب المركز وحساب المدير الخاص بك. تجربة مجانية 14 يوماً.",
    tenantName: "اسم المركز / المدرس",
    tenantSlug: "المعرّف (بالإنجليزية)",
    tenantSlugHint: "اسم مختصر لمركزك بالإنجليزية، يظهر في الروابط والتقارير.",
    fullName: "اسمك الكامل",
    submit: "إنشاء الحساب",
    haveAccount: "لديك حساب؟",
    signIn: "تسجيل الدخول",
  },
  forgot: {
    title: "نسيت كلمة المرور؟",
    description: "أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.",
    submit: "إرسال رابط إعادة التعيين",
    remembered: "تذكرت كلمة المرور؟",
    signIn: "تسجيل الدخول",
    sentTitle: "تحقق من بريدك",
    sentDescription: "إن كان البريد مسجلاً لدينا فستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور. الرابط صالح لمدة 60 دقيقة.",
    devModeTitle: "وضع التطوير",
    devModeText: "لم يتم ضبط SMTP بعد، هذا هو رابط إعادة التعيين: {link}",
    backToLogin: "العودة لتسجيل الدخول",
  },
  reset: {
    invalidTitle: "رابط غير صالح",
    invalidDescription: "هذا الرابط لا يحتوي على رمز إعادة تعيين. اطلب رابطاً جديداً.",
    requestNew: "طلب رابط جديد",
    title: "كلمة مرور جديدة",
    description: "اختر كلمة مرور قوية تستوفي الشروط أدناه. سيتم تسجيل خروجك من كل الأجهزة.",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    submit: "حفظ كلمة المرور",
    backToLogin: "العودة لتسجيل الدخول",
  },
};

export default auth;
