"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCallerIsAdmin } from "@/lib/admin-gate";
import { buildCsv, dateStamp } from "@/lib/csv-export";

type Result =
  | { ok: true; filename: string; content: string }
  | { ok: false; error: string };

type BranchRow = {
  id: string;
  name: string;
  name_en: string | null;
  city: string;
  address: string;
  phone: string | null;
  active: boolean;
  sort_order: number;
};

export async function exportBranchesCsv(): Promise<Result> {
  const gate = await assertCallerIsAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id,name,name_en,city,address,phone,active,sort_order")
    .order("sort_order");
  if (error) return { ok: false, error: error.message };

  const rows = (data ?? []) as BranchRow[];
  const headers = [
    "الترتيب",
    "اسم الفرع",
    "الاسم بالإنجليزية",
    "المدينة",
    "العنوان",
    "الجوال",
    "الحالة",
    "المعرّف",
  ];
  const csvRows = rows.map((b) => [
    b.sort_order,
    b.name,
    b.name_en ?? "",
    b.city,
    b.address,
    b.phone ?? "",
    b.active ? "نشط" : "معطّل",
    b.id,
  ]);

  return {
    ok: true,
    filename: `branches_${dateStamp()}.csv`,
    content: buildCsv(headers, csvRows),
  };
}
