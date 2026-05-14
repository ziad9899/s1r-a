"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCallerCanManageContent } from "@/lib/admin-gate";

export type TrustItemValues = {
  id: string;
  icon_key: string;
  label_ar: string;
  label_en: string;
  tone: string;
  sort_order: number;
  is_active: boolean;
};

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateTrustItem(
  values: TrustItemValues,
): Promise<ActionResult> {
  const gate = await assertCallerCanManageContent();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!values.label_ar.trim()) {
    return { ok: false, error: "العنوان العربي مطلوب." };
  }
  if (!values.icon_key.trim()) {
    return { ok: false, error: "اختر أيقونة." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("trust_items")
    .update({
      icon_key: values.icon_key,
      label_ar: values.label_ar.trim(),
      label_en: values.label_en.trim(),
      tone: values.tone,
      sort_order: values.sort_order,
      is_active: values.is_active,
    })
    .eq("id", values.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/trust-items");
  return { ok: true };
}
