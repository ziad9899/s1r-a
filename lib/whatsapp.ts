import { vehicleLabel } from "./formatters";
import type { BookingRow, BookingStatus, CustomerProfile } from "./bookings";

export type WhatsAppTemplate =
  | "confirm"
  | "remind24h"
  | "remind1h"
  | "thank"
  | "cancel";

export const TEMPLATE_LABELS: Record<WhatsAppTemplate, string> = {
  confirm: "تأكيد الحجز",
  remind24h: "تذكير قبل يوم",
  remind1h: "تذكير قبل ساعة",
  thank: "شكر بعد الخدمة",
  cancel: "إعلام بالإلغاء",
};

const AR_DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const AR_TIME = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  hour: "numeric",
  minute: "2-digit",
});

function firstName(c: CustomerProfile | null | undefined): string {
  return c?.first_name?.trim() || "ضيفنا";
}

// Build the message body. Length stays under ~380 chars so WhatsApp shows
// it without "Read more" truncation. PDPL: skip price + plate + internal
// notes; only fields the customer needs to attend the appointment.
export function buildWhatsAppMessage(
  template: WhatsAppTemplate,
  booking: BookingRow,
  customer: CustomerProfile | null,
): string {
  const name = firstName(customer);
  const date = AR_DATE.format(new Date(booking.scheduled_at));
  const time = AR_TIME.format(new Date(booking.scheduled_at));
  const service = booking.service_name;
  const branch = booking.branch_name;
  const vehicle = vehicleLabel(booking.vehicle_type);

  switch (template) {
    case "confirm":
      return [
        `يا هلا ${name} ✅`,
        `حجزك في *S1R* تأكّد.`,
        ``,
        `الخدمة: ${service}`,
        `📅 *${date}*`,
        `⏰ *${time}*`,
        `📍 ${branch}`,
        `🚗 ${vehicle}`,
        ``,
        `نشرّفنا بك. للتعديل ردّ هنا في أيّ وقت.`,
      ].join("\n");

    case "remind24h":
      return [
        `يا هلا ${name}`,
        `تذكير ودّي بموعدك في *S1R* غداً.`,
        ``,
        `📅 *${date}*`,
        `⏰ *${time}*`,
        `📍 ${branch}`,
        `الخدمة: ${service}`,
        ``,
        `ردّ بـ ✅ للتأكيد، أو اقترح وقتاً آخر.`,
      ].join("\n");

    case "remind1h":
      return [
        `يا هلا ${name}`,
        `موعدك بعد ساعة في *S1R* — ${branch}، الساعة *${time}*.`,
        `نجهّز لك المكان. القيادة بأمان.`,
      ].join("\n");

    case "thank":
      return [
        `يا هلا ${name}`,
        `سيارتك جاهزة وتشرّفنا بخدمتك في *S1R* ✅`,
        `الخدمة: ${service}`,
        ``,
        `نسعد برأيك بكلمة هنا — يساعدنا نكبر.`,
      ].join("\n");

    case "cancel":
      return [
        `يا هلا ${name}`,
        `تم إلغاء حجز *S1R*:`,
        `~${date} — ${time}~`,
        ``,
        `نعتذر عن الإزعاج. متى ما تجهز نحجز لك من جديد، فقط ردّ هنا.`,
      ].join("\n");
  }
}

// wa.me requires digits only — no `+`, no spaces, no dashes. Newlines are
// `%0A` which encodeURIComponent emits naturally for `\n`.
export function whatsAppUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// Default template for the current status. Operator's single click on the
// primary button produces the right message; dropdown is for overrides.
export function defaultTemplateForStatus(
  status: BookingStatus,
): WhatsAppTemplate {
  switch (status) {
    case "pending":
      return "confirm";
    case "confirmed":
      return "remind24h";
    case "in_progress":
      return "remind1h";
    case "completed":
      return "thank";
    case "cancelled":
      return "cancel";
  }
}

// All templates relevant for a given status, ordered by likelihood.
export function templatesForStatus(status: BookingStatus): WhatsAppTemplate[] {
  switch (status) {
    case "pending":
      return ["confirm", "cancel"];
    case "confirmed":
      return ["remind24h", "remind1h", "confirm", "cancel"];
    case "in_progress":
      return ["remind1h", "thank"];
    case "completed":
      return ["thank"];
    case "cancelled":
      return ["cancel", "confirm"];
  }
}
