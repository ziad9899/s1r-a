"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertCallerIsSuperAdmin } from "@/lib/admin-gate";

// Manual wallet compensation credit. This moves real money into a customer's
// wallet, so it is super_admin-only. The gate is load-bearing: getSupabaseAdmin()
// uses the service-role key and bypasses RLS, so the RLS policies alone do not
// protect this — the gate here does.
type Result =
  | { ok: true; balance: number }
  | { ok: false; error: string };

export async function creditWallet(input: {
  phoneE164: string;
  amount: number;
  reason: string;
}): Promise<Result> {
  const gate = await assertCallerIsSuperAdmin();
  if (!gate.ok) return gate;

  const phoneE164 = input.phoneE164.trim();
  const reason = input.reason.trim();
  const amount = input.amount;

  // Must match a customer's app phone exactly (E.164) or we won't find them.
  if (!/^\+9665\d{8}$/.test(phoneE164)) {
    return { ok: false, error: "رقم الجوال غير صالح. مثال: +9665XXXXXXXX" };
  }
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: "المبلغ غير صالح. أدخل رقماً غير صفري." };
  }
  if (reason.length < 2) {
    return { ok: false, error: "السبب مطلوب (يظهر للعميل)." };
  }

  const admin = getSupabaseAdmin();

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phoneE164)
    .maybeSingle();
  if (profileErr) return { ok: false, error: profileErr.message };
  if (!profile) return { ok: false, error: "لا يوجد عميل بهذا الجوال" };

  const { data, error } = await admin.rpc("wallet_apply", {
    p_user: profile.id,
    p_amount: amount,
    p_type: "compensation",
    p_reason: reason,
    p_source_ref: null,
    p_idem_key: "manual:" + crypto.randomUUID(),
    p_created_by: gate.callerId,
  });
  if (error) {
    // Most likely a negative amount that would overdraw the wallet.
    if (/insufficient/i.test(error.message)) {
      return {
        ok: false,
        error: "رصيد المحفظة لا يكفي لهذا الخصم.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/wallet");
  return { ok: true, balance: Number(data) };
}
