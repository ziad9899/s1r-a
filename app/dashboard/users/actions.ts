"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertCallerIsAdmin } from "@/lib/admin-gate";
import { BAN_DURATIONS, type BanPreset } from "./ban-durations";

type Result = { ok: true } | { ok: false; error: string };

export async function banUser(
  targetId: string,
  preset: BanPreset,
): Promise<Result> {
  const gate = await assertCallerIsAdmin();
  if (!gate.ok) return gate;
  if (gate.callerId === targetId) {
    return { ok: false, error: "لا يمكنك حظر حسابك أنت." };
  }
  const duration = BAN_DURATIONS[preset];
  if (!duration) {
    return { ok: false, error: "مدّة حظر غير صالحة." };
  }
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(targetId, {
    ban_duration: duration,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/users");
  return { ok: true };
}

export async function unbanUser(targetId: string): Promise<Result> {
  const gate = await assertCallerIsAdmin();
  if (!gate.ok) return gate;
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(targetId, {
    ban_duration: "none",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/users");
  return { ok: true };
}

// Hard delete: removes the auth.users row. `profiles` and `bookings` cascade
// via `on delete cascade` foreign keys (migrations 0001 + 0002), so this
// single call wipes the user's footprint across the project.
export async function deleteUser(
  targetId: string,
  phoneConfirmation: string,
): Promise<Result> {
  const gate = await assertCallerIsAdmin();
  if (!gate.ok) return gate;
  if (gate.callerId === targetId) {
    return { ok: false, error: "لا يمكنك حذف حسابك أنت." };
  }

  // Force the caller to retype the target's phone — defends against
  // misclicks and screen-share screenshots that surface UUIDs but not the
  // human phone number.
  const { data: profile, error: profErr } = await getSupabaseAdmin()
    .from("profiles")
    .select("phone")
    .eq("id", targetId)
    .maybeSingle();
  if (profErr) return { ok: false, error: profErr.message };
  if (!profile) return { ok: false, error: "المستخدم غير موجود." };
  if (profile.phone.trim() !== phoneConfirmation.trim()) {
    return { ok: false, error: "رقم التأكيد لا يطابق." };
  }

  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(targetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/users");
  return { ok: true };
}
