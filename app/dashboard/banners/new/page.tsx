import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BannerEditForm } from "../banner-edit-form";

export default async function NewBannerPage() {
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
        href="/dashboard/banners"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع للقائمة
      </Link>
      <div>
        <h1 className="text-2xl font-bold">بنر جديد</h1>
        <p className="text-sm text-muted-foreground">
          اختر صورة 1600×900 لأفضل تجربة، أضف عنواناً مختصراً، وحدّد الوجهة.
        </p>
      </div>
      <BannerEditForm services={services} isNew />
    </div>
  );
}
