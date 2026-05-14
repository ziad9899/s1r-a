import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BannerEditForm, type BannerFormValues } from "../banner-edit-form";

export default async function BannerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [bannerRes, servicesRes] = await Promise.all([
    supabase.from("banners").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("services")
      .select("id,name")
      .eq("active", true)
      .order("sort_order"),
  ]);

  if (!bannerRes.data) notFound();

  const b = bannerRes.data;
  const initial: BannerFormValues = {
    id: b.id,
    image_url: b.image_url,
    title_ar: b.title_ar,
    title_en: b.title_en,
    target_type: b.target_type,
    target_value: b.target_value,
    sort_order: b.sort_order,
    is_active: b.is_active,
    start_at: b.start_at,
    end_at: b.end_at,
  };

  const services = (servicesRes.data ?? []) as { id: string; name: string }[];

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
        <h1 className="text-2xl font-bold">تعديل البنر</h1>
        <p className="text-sm text-muted-foreground font-mono text-xs">{b.id}</p>
      </div>
      <BannerEditForm initial={initial} services={services} isNew={false} />
    </div>
  );
}
