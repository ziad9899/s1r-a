import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ServiceEditForm } from "./service-edit-form";

export default async function ServiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [serviceRes, categoriesRes] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("service_filters")
      .select("id, label_ar")
      .order("sort_order"),
  ]);

  if (!serviceRes.data) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/dashboard/services"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع للقائمة
      </Link>
      <div>
        <h1 className="text-2xl font-bold">تعديل الخدمة</h1>
        <p className="text-sm text-muted-foreground">{serviceRes.data.id}</p>
      </div>
      <ServiceEditForm
        service={serviceRes.data}
        categories={categoriesRes.data ?? []}
      />
    </div>
  );
}
