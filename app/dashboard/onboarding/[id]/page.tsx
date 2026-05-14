import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SlideEditForm, type SlideFormValues } from "../slide-edit-form";

export default async function SlideEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("onboarding_slides")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const initial: SlideFormValues = {
    id: data.id,
    image_url: data.image_url,
    title_ar: data.title_ar ?? "",
    title_en: data.title_en,
    body_ar: data.body_ar ?? "",
    body_en: data.body_en,
    sort_order: data.sort_order,
    is_active: data.is_active,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        href="/dashboard/onboarding"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع للقائمة
      </Link>
      <div>
        <h1 className="text-2xl font-bold">تعديل شاشة الترحيب</h1>
        <p className="text-sm text-muted-foreground font-mono text-xs">
          {data.id}
        </p>
      </div>
      <SlideEditForm initial={initial} isNew={false} />
    </div>
  );
}
