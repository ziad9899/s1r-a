import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FilterEditForm } from "../filter-edit-form";

export default async function NewFilterPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("services")
    .select("id,name")
    .eq("active", true)
    .order("sort_order");
  const services = (data ?? []) as { id: string; name: string }[];

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
        <h1 className="text-2xl font-bold">فلتر جديد</h1>
        <p className="text-sm text-muted-foreground">
          اكتب المسمّى الذي سيظهر للعميل، ثم اختر الخدمة التي يفلتر إليها.
        </p>
      </div>
      <FilterEditForm services={services} isNew />
    </div>
  );
}
