// Static labels + colors for booking statuses. Mirrors the BookingStatus
// enum in the Flutter app.

// Ordered to match the customer-facing tracking timeline in the Flutter app
// (اعتماد الطلب → السطحة قادمة → تم الاستلام → جاري العمل → تم الإرسال → مكتمل).
// The dropdown renders them in this order so an admin advances the booking
// stage by stage. Mirrors the BookingStatus enum in the Flutter app — keep
// the two in lockstep.
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "tow_on_the_way",
  "car_received",
  "in_progress",
  "car_dispatched",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكّد",
  tow_on_the_way: "السطحة قادمة",
  car_received: "تم استلام السيارة",
  in_progress: "جاري العمل",
  car_dispatched: "تم إرسال السيارة",
  completed: "منتهي",
  cancelled: "ملغي",
};

export const STATUS_TONES: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  confirmed: "bg-sky-100 text-sky-900 border-sky-300",
  tow_on_the_way: "bg-orange-100 text-orange-900 border-orange-300",
  car_received: "bg-cyan-100 text-cyan-900 border-cyan-300",
  in_progress: "bg-indigo-100 text-indigo-900 border-indigo-300",
  car_dispatched: "bg-violet-100 text-violet-900 border-violet-300",
  completed: "bg-emerald-100 text-emerald-900 border-emerald-300",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

// Push copy sent to the customer when a booking reaches each stage. `null`
// = no notification (e.g. the internal `pending` state). Fired best-effort
// from `updateBookingStatus` via the existing `send-push` Edge Function.
export const STATUS_PUSH: Record<
  BookingStatus,
  { title: string; body: string } | null
> = {
  pending: null,
  confirmed: {
    title: "تم اعتماد طلبك ✅",
    body: "طلبك تم اعتماده وجارٍ التجهيز.",
  },
  tow_on_the_way: {
    title: "السطحة في الطريق 🚚",
    body: "سطحتنا قادمة لاستلام سيارتك.",
  },
  car_received: {
    title: "تم استلام سيارتك 🚗",
    body: "استلمنا سيارتك وسنبدأ العمل عليها قريباً.",
  },
  in_progress: {
    title: "جاري العمل على سيارتك 🧽",
    body: "فريقنا يعمل على سيارتك الآن.",
  },
  car_dispatched: {
    title: "سيارتك في الطريق إليك 🚚",
    body: "تم إرسال سيارتك، ستصلك قريباً.",
  },
  completed: {
    title: "طلبك مكتمل ✅",
    body: "تم إكمال خدمة سيارتك. شكراً لثقتك بنا!",
  },
  cancelled: {
    title: "تم إلغاء طلبك",
    body: "تم إلغاء حجزك. لأي استفسار تواصل معنا.",
  },
};

export type BookingRow = {
  id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  service_icon_key: string;
  branch_id: string;
  branch_name: string;
  vehicle_type: string;
  vehicle_plate: string | null;
  vehicle_year: number | null;
  color: string | null;
  notes: string | null;
  scheduled_at: string;
  status: BookingStatus;
  estimated_price_sar: number;
  created_at: string;
};

export type CustomerProfile = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  saved_vehicle: unknown;
  created_at: string;
};

export function customerFullName(
  p: CustomerProfile | null | undefined,
): string {
  if (!p) return "—";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
}

const AR_DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatBookingDate(iso: string): string {
  return AR_DATE.format(new Date(iso));
}

export function formatPrice(amount: number): string {
  return `${amount.toLocaleString("en-US")} ر.س`;
}

// Normalize a phone string to bare digits with the Saudi country code and any
// leading zero stripped, so 0501234567 / 501234567 / +966501234567 /
// 966501234567 all reduce to the same "501234567". Mirrors the users page so
// phone search behaves identically across the dashboard.
export function normalizePhone(s: string): string {
  return s.replace(/\D/g, "").replace(/^966/, "").replace(/^0/, "");
}

// True when a profile matches the free-text search: name (case-insensitive
// substring over first / last / full) OR phone (Saudi-normalized on both sides,
// only when the query actually contains a digit).
export function profileMatchesQuery(
  p: Pick<CustomerProfile, "first_name" | "last_name" | "phone">,
  q: string,
): boolean {
  const ql = q.trim().toLowerCase();
  if (!ql) return true;
  const first = (p.first_name ?? "").toLowerCase();
  const last = (p.last_name ?? "").toLowerCase();
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").toLowerCase();
  const nameMatch = full.includes(ql) || first.includes(ql) || last.includes(ql);

  const qHasDigit = /\d/.test(q);
  const qPhone = qHasDigit ? normalizePhone(q) : "";
  const phoneMatch =
    qHasDigit && qPhone.length > 0 && normalizePhone(p.phone ?? "").includes(qPhone);

  return nameMatch || phoneMatch;
}
