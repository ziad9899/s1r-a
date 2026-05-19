import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FilterEditForm, type FilterFormValues } from "../filter-edit-form";

export default async function FilterEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const filterRes = await supabase
    .from("service_filters")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!filterRes.data) notFound();

  const f = filterRes.data;
  const initial: FilterFormValues = {
    id: f.id,
    label_ar: f.label_ar ?? "",
    label_en: f.label_en,
    sort_order: f.sort_order,
    is_active: f.is_active,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/dashboard/filters"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع للقائمة
      </Link>
      <div>
        <h1 className="text-2xl font-bold">تعديل الفئة</h1>
        <p className="text-sm text-muted-foreground font-mono text-xs">{f.id}</p>
      </div>
      <FilterEditForm initial={initial} isNew={false} />
    </div>
  );
}
