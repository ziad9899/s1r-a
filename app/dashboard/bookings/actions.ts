"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCallerIsAdmin } from "@/lib/admin-gate";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/bookings";

// Update a booking's status. RLS already gates this update behind
// `is_admin()`, but we re-check the caller's role here too — defense in
// depth in case a policy is dropped by an out-of-order migration. Audit
// trigger records the diff automatically.
export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!BOOKING_STATUSES.includes(status)) {
    return { ok: false, error: "حالة غير صالحة." };
  }
  const gate = await assertCallerIsAdmin();
  if (!gate.ok) return gate;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  return { ok: true };
}
