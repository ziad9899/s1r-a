// Ready-made copy for common booking touch points. The admin picks one
// from the dropdown and the form pre-fills title/body. They can edit
// further before sending.

export type NotificationTemplate = {
  key: string;
  label: string;
  title: string;
  body: string;
};

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    key: "booking_confirmed",
    label: "تأكيد حجز",
    title: "تم تأكيد حجزك ✓",
    body: "نتطلع لرؤيتك في موعدك. يمكنك مراجعة التفاصيل من قسم حجوزاتي.",
  },
  {
    key: "reminder_day",
    label: "تذكير قبل يوم",
    title: "تذكير: موعدك غدًا",
    body: "نذكّرك بموعدك غدًا. لو تحتاج تعديلًا تواصل معنا قبل ست ساعات.",
  },
  {
    key: "reminder_hour",
    label: "تذكير قبل ساعة",
    title: "موعدك خلال ساعة",
    body: "الفنّي في الطريق إليك. تأكد من توفّر السيارة ومفاتيحها.",
  },
  {
    key: "service_done",
    label: "شكراً بعد الخدمة",
    title: "تمت خدمة سيارتك ✨",
    body: "شكرًا لاختيارك S1R. نتمنى أن تكون التجربة على قدر تطلعاتك.",
  },
  {
    key: "promo",
    label: "عرض ترويجي",
    title: "عرض حصري لك",
    body: "خصم 20% على نانو سيراميك حتى نهاية الأسبوع. احجز الآن.",
  },
  {
    key: "winback",
    label: "استعادة عميل",
    title: "اشتقنا لك 👋",
    body: "خصم خاص لعودتك — اطلب خدمتك المفضّلة بـ 15% أقل هذا الشهر.",
  },
];
