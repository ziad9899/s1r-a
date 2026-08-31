"use server";

import { revalidatePath } from "next/cache";

import { assertCallerIsSuperAdmin } from "@/lib/admin-gate";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { SECRET_NAMES, type SavePaymentInput } from "./config";

export async function savePaymentConfig(
  input: SavePaymentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertCallerIsSuperAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const admin = getSupabaseAdmin();

  // 1) Provider on/off toggles (non-secret) → app_settings (app reads these).
  const { error: tErr } = await admin.from("app_settings").upsert([
    { key: "tabby_enabled", value: input.tabbyEnabled ? "true" : "false" },
    { key: "madfu_enabled", value: input.madfuEnabled ? "true" : "false" },
  ]);
  if (tErr) return { ok: false, error: `تعذّر حفظ الحالة: ${tErr.message}` };

  // 2) Credentials → Vault (encrypted), one RPC per changed field. Only fields
  // the admin actually typed are written; blanks leave the current value.
  for (const name of SECRET_NAMES) {
    const value = (input.secrets[name] ?? "").trim();
    if (!value) continue;
    const { error } = await admin.rpc("set_payment_secret", {
      p_name: name,
      p_value: value,
      p_actor: gate.callerId,
    });
    if (error) {
      return { ok: false, error: `تعذّر حفظ المفتاح ${name}: ${error.message}` };
    }
  }

  revalidatePath("/dashboard/payments");
  return { ok: true };
}
