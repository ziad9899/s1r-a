// Static labels + colors for booking statuses. Mirrors the BookingStatus
// enum in the Flutter app.

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكّد",
  in_progress: "قيد التنفيذ",
  completed: "منتهي",
  cancelled: "ملغي",
};

export const STATUS_TONES: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  confirmed: "bg-sky-100 text-sky-900 border-sky-300",
  in_progress: "bg-indigo-100 text-indigo-900 border-indigo-300",
  completed: "bg-emerald-100 text-emerald-900 border-emerald-300",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-300",
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
