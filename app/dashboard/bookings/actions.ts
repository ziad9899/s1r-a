"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCallerIsAdmin } from "@/lib/admin-gate";
import { BOOKING_STATUSES, STATUS_PUSH, type BookingStatus } from "@/lib/bookings";

// Update a booking's status. RLS already gates this update behind
// `is_admin()`, but we re-check the caller's role here too — defense in
// depth in case a policy is dropped by an out-of-order migration. Audit
// trigger records the diff automatically. On success we also notify the
// customer that their order reached a new tracking stage (best-effort).
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
  const { data: row, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("user_id")
    .single();
  if (error) {
    return { ok: false, error: error.message };
  }

  // Notify the customer of the new stage. Best-effort: a push/token failure
  // must never fail the status update the admin just made.
  const push = STATUS_PUSH[status];
  if (push && row?.user_id) {
    try {
      await supabase.functions.invoke("send-push", {
        body: {
          user_ids: [row.user_id],
          title: push.title,
          body: push.body,
          kind: "booking",
          booking_id: id,
          data: { route: `/booking/${id}` },
        },
      });
    } catch {
      // swallow — the stage change is already persisted.
    }
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  return { ok: true };
}
