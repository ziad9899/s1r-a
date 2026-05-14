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

  const [filterRes, servicesRes] = await Promise.all([
    supabase.from("service_filters").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("services")
      .select("id,name")
      .eq("active", true)
      .order("sort_order"),
  ]);

  if (!filterRes.data) notFound();

  const f = filterRes.data;
  const initial: FilterFormValues = {
    id: f.id,
    label_ar: f.label_ar ?? "",
    label_en: f.label_en,
    target_service_id: f.target_service_id,
    sort_order: f.sort_order,
    is_active: f.is_active,
  };
  const services = (servicesRes.data ?? []) as { id: string; name: string }[];

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
        <h1 className="text-2xl font-bold">تعديل الفلتر</h1>
        <p className="text-sm text-muted-foreground font-mono text-xs">{f.id}</p>
      </div>
      <FilterEditForm initial={initial} services={services} isNew={false} />
    </div>
  );
}
