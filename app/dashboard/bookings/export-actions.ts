"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCallerIsAdmin } from "@/lib/admin-gate";
import { buildCsv, dateStamp } from "@/lib/csv-export";
import {
  STATUS_LABELS,
  customerFullName,
  type BookingRow,
  type BookingStatus,
  type CustomerProfile,
} from "@/lib/bookings";
import { vehicleLabel } from "@/lib/formatters";

type Result =
  | { ok: true; filename: string; content: string }
  | { ok: false; error: string };

// Riyadh-local timestamp for CSV ("YYYY-MM-DD HH:MM") so exported times match
// exactly what the customer booked (not the UTC the DB stores).
function riyadhStamp(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Riyadh" });
}

export async function exportBookingsCsv(): Promise<Result> {
  const gate = await assertCallerIsAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createSupabaseServerClient();
  // Cap at 10k rows to stay under the Vercel function timeout (10-25s). At
  // that size the CSV lands well under 5 MB which streams fine over the
  // serverless response. If the dataset grows past this we'll have to add
  // a date-range filter or move the export to a background job.
  const EXPORT_LIMIT = 10_000;
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,user_id,service_name,branch_name,vehicle_type,vehicle_plate,vehicle_year,color,scheduled_at,status,estimated_price_sar,created_at",
    )
    .order("scheduled_at", { ascending: false })
    .limit(EXPORT_LIMIT);
  if (error) return { ok: false, error: error.message };

  const rows = (data ?? []) as BookingRow[];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const profiles = userIds.length
    ? ((
        await supabase
          .from("profiles")
          .select("id,first_name,last_name,phone,saved_vehicle,created_at")
          .in("id", userIds)
      ).data ?? [])
    : [];
  const profileMap = new Map<string, CustomerProfile>();
  for (const p of profiles as CustomerProfile[]) profileMap.set(p.id, p);

  const headers = [
    "رقم الحجز",
    "العميل",
    "الجوال",
    "الخدمة",
    "الفرع",
    "الموعد",
    "السيارة",
    "اللوحة",
    "السنة",
    "اللون",
    "السعر التقديري",
    "الحالة",
    "تاريخ الإنشاء",
  ];
  const csvRows = rows.map((b) => {
    const c = profileMap.get(b.user_id);
    return [
      b.id,
      customerFullName(c),
      c?.phone ?? "",
      b.service_name,
      b.branch_name,
      riyadhStamp(b.scheduled_at),
      vehicleLabel(b.vehicle_type),
      b.vehicle_plate ?? "",
      b.vehicle_year ?? "",
      b.color ?? "",
      b.estimated_price_sar,
      STATUS_LABELS[b.status] ?? b.status,
      riyadhStamp(b.created_at),
    ];
  });

  return {
    ok: true,
    filename: `bookings_${dateStamp()}.csv`,
    content: buildCsv(headers, csvRows),
  };
}
