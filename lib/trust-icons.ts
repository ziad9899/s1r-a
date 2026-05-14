// Mirror of trustIconFor() in Flutter
// (lib/features/home/domain/entities/trust_item_row.dart).
// The strings here are the keys the admin can pick from; the emoji is a
// visual hint shown in the dropdown so the picker stays usable without
// rendering Material Icons in the dashboard.

export type TrustIconKey =
  | "bolt"
  | "verified"
  | "car"
  | "schedule"
  | "headset"
  | "premium"
  | "shield"
  | "star"
  | "gift"
  | "location"
  | "phone"
  | "wallet"
  | "support"
  | "eco"
  | "magic";

export const TRUST_ICON_OPTIONS: { key: TrustIconKey; emoji: string; ar: string }[] = [
  { key: "bolt", emoji: "⚡", ar: "حجز فوري / سرعة" },
  { key: "verified", emoji: "✓", ar: "ضمان / موثوق" },
  { key: "car", emoji: "🚗", ar: "تنقل / خدمة منزلية" },
  { key: "schedule", emoji: "⏰", ar: "مواعيد / وقت" },
  { key: "headset", emoji: "🎧", ar: "دعم / خدمة عملاء" },
  { key: "premium", emoji: "👑", ar: "تميّز / فاخر" },
  { key: "shield", emoji: "🛡", ar: "أمان / حماية" },
  { key: "star", emoji: "⭐", ar: "تقييم / جودة" },
  { key: "gift", emoji: "🎁", ar: "عرض / هدية" },
  { key: "location", emoji: "📍", ar: "موقع / فرع" },
  { key: "phone", emoji: "📞", ar: "تواصل / اتصال" },
  { key: "wallet", emoji: "💳", ar: "دفع / سعر" },
  { key: "support", emoji: "🤝", ar: "دعم / مساعدة" },
  { key: "eco", emoji: "🌿", ar: "صديق بيئة" },
  { key: "magic", emoji: "✨", ar: "تجربة فريدة" },
];

export const TRUST_TONES = [
  { key: "primary", label: "أزرق (الأساسي)", swatch: "#1E7FCC" },
  { key: "success", label: "أخضر (نجاح)", swatch: "#1FA971" },
  { key: "amber", label: "كهرماني (مميّز)", swatch: "#E69020" },
  { key: "info", label: "أزرق فاتح (معلومة)", swatch: "#2F86E0" },
  { key: "error", label: "أحمر (تنبيه)", swatch: "#E5484D" },
] as const;

export type TrustTone = (typeof TRUST_TONES)[number]["key"];

export function trustIconEmoji(key: string): string {
  return TRUST_ICON_OPTIONS.find((o) => o.key === key)?.emoji ?? "•";
}

export function trustToneSwatch(tone: string): string {
  return TRUST_TONES.find((t) => t.key === tone)?.swatch ?? "#1E7FCC";
}
