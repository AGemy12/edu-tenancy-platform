/** Error and not-found pages. */
const errors = {
  notFound: {
    code: "404",
    title: "الصفحة غير موجودة",
    text: "ربما نُقلت الصفحة أو أن الرابط غير صحيح.",
  },
  failed: {
    title: "حدث خطأ غير متوقع",
    text: "نعتذر، تعذر عرض هذه الصفحة. حاول مرة أخرى، وإن تكرر الخطأ فتواصل مع الدعم.",
    reference: "رقم المرجع: {digest}",
  },
  home: "العودة للرئيسية",
};

export default errors;
