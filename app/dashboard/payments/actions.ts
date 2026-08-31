"use server";

import { revalidatePath } from "next/cache";

import { assertCallerIsSuperAdmin } from "@/lib/admin-gate";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// The credential names — these MUST match the env-var names the Edge Functions
// read, so the Vault value seamlessly overrides the env fallback (see
// supabase/functions/_shared/secrets.ts). Secret VALUES never reach the browser:
// they are written here (server-only, service role) and never read back.
export const SECRET_NAMES = [
  "MOYASAR_SECRET_KEY",
  "MOYASAR_WEBHOOK_SECRET",
  "TABBY_SECRET_KEY",
  "TABBY_MERCHANT_CODE",
  "TABBY_WEBHOOK_SECRET",
  "MADFU_AUTH",
  "MADFU_APP_CODE",
  "MADFU_API_KEY",
  "MADFU_WEBHOOK_SECRET",
] as const;

export type SavePaymentInput = {
  tabbyEnabled: boolean;
  madfuEnabled: boolean;
  // name -> new value. Only NON-EMPTY entries are written (write-only fields;
  // an empty field means "leave the current value unchanged").
  secrets: Record<string, string>;
};

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
