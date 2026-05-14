"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ADMIN_TIERS, type AdminTier } from "@/lib/admin-roles";
import { assertCallerIsSuperAdmin } from "@/lib/admin-gate";

type Result = { ok: true } | { ok: false; error: string };

// E.164 Saudi mobile guard — mirrors the Flutter signup validator so the
// `pseudo-email` row in `auth.users` stays consistent with what the
// Flutter app expects when this admin signs in there too.
function isValidPhone(raw: string): boolean {
  return /^\+9665\d{8}$/.test(raw);
}

function isAssignableRole(value: unknown): value is AdminTier {
  return typeof value === "string" && (ADMIN_TIERS as readonly string[]).includes(value);
}

export async function inviteAdmin(input: {
  firstName: string;
  lastName: string;
  phoneE164: string;
  email: string;
  password: string;
  role: AdminTier;
}): Promise<Result & { userId?: string }> {
  const gate = await assertCallerIsSuperAdmin();
  if (!gate.ok) return gate;

  const { firstName, lastName, phoneE164, email, password, role } = input;

  if (firstName.trim().length < 2) {
    return { ok: false, error: "الاسم الأول قصير." };
  }
  if (lastName.trim().length < 2) {
    return { ok: false, error: "الاسم الأخير قصير." };
  }
  if (!isAssignableRole(role)) {
    return { ok: false, error: "الدور غير صالح." };
  }
  if (password.length < 8) {
    return { ok: false, error: "كلمة المرور 8 أحرف فأكثر." };
  }
  // The admin's primary identity in `auth.users` is the *real* email they
  // gave — we still record the phone on the profile but the login uses
  // the email, not the pseudo-phone-email pattern of customer accounts.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "البريد الإلكتروني غير صالح." };
  }
  if (!isValidPhone(phoneE164)) {
    return { ok: false, error: "رقم الجوال غير صالح. مثال: +9665XXXXXXXX" };
  }

  const admin = getSupabaseAdmin();

  // Phone collisions are now handled by a partial UNIQUE index that only
  // fires for `role = 'customer'` (migration 0022). Admin tiers may share
  // a number freely since they log in via email, not phone. No pre-check
  // needed — let the DB report the rare customer-collision case.

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName.trim(), last_name: lastName.trim() },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? "تعذّر إنشاء المستخدم." };
  }
  const newId = created.user.id;

  const { error: profErr } = await admin.from("profiles").insert({
    id: newId,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    phone: phoneE164,
    role,
    phone_verified: true,
  });
  if (profErr) {
    // Roll back the auth user so we don't strand an orphaned login.
    await admin.auth.admin.deleteUser(newId).catch(() => {});
    return { ok: false, error: `تعذّر حفظ الملف الشخصي: ${profErr.message}` };
  }

  revalidatePath("/dashboard/admins");
  return { ok: true, userId: newId };
}

export async function changeAdminRole(
  targetId: string,
  newRole: AdminTier,
): Promise<Result> {
  const gate = await assertCallerIsSuperAdmin();
  if (!gate.ok) return gate;
  if (!isAssignableRole(newRole)) {
    return { ok: false, error: "الدور غير صالح." };
  }
  if (gate.callerId === targetId && newRole !== "super_admin") {
    return { ok: false, error: "لا يمكنك تنزيل دورك بنفسك." };
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetId);
  if (error) {
    // The DB trigger surfaces a friendly message when we try to remove
    // the last super_admin.
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/admins");
  return { ok: true };
}

// Demoting to 'customer' takes the user out of the admin tier entirely —
// they keep their account (and any bookings) but lose dashboard access.
export async function revokeAdmin(targetId: string): Promise<Result> {
  const gate = await assertCallerIsSuperAdmin();
  if (!gate.ok) return gate;
  if (gate.callerId === targetId) {
    return { ok: false, error: "لا يمكنك إزالة صلاحيتك بنفسك." };
  }
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .update({ role: "customer" })
    .eq("id", targetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/admins");
  return { ok: true };
}
