"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCallerIsAdmin } from "@/lib/admin-gate";
import { buildCsv, dateStamp } from "@/lib/csv-export";

type Result =
  | { ok: true; filename: string; content: string }
  | { ok: false; error: string };

type ServiceRow = {
  id: string;
  name: string;
  name_en: string | null;
  starting_price_sar: number;
  duration_label: string | null;
  tag: string | null;
  active: boolean;
  sort_order: number;
};

export async function exportServicesCsv(): Promise<Result> {
  const gate = await assertCallerIsAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id,name,name_en,starting_price_sar,duration_label,tag,active,sort_order",
    )
    .order("sort_order");
  if (error) return { ok: false, error: error.message };

  const rows = (data ?? []) as ServiceRow[];
  const headers = [
    "الترتيب",
    "اسم الخدمة",
    "الاسم بالإنجليزية",
    "السعر الأساسي",
    "المدة",
    "الوسم",
    "الحالة",
    "المعرّف",
  ];
  const csvRows = rows.map((s) => [
    s.sort_order,
    s.name,
    s.name_en ?? "",
    s.starting_price_sar,
    s.duration_label ?? "",
    s.tag ?? "",
    s.active ? "نشط" : "معطّل",
    s.id,
  ]);

  return {
    ok: true,
    filename: `services_${dateStamp()}.csv`,
    content: buildCsv(headers, csvRows),
  };
}
