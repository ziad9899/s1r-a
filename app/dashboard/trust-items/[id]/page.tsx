import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TrustItemForm } from "../trust-item-form";
import type { TrustItemValues } from "../actions";

export default async function TrustItemEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("trust_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const initial: TrustItemValues = {
    id: data.id,
    icon_key: data.icon_key,
    label_ar: data.label_ar ?? "",
    label_en: data.label_en ?? "",
    tone: data.tone ?? "primary",
    sort_order: data.sort_order ?? 0,
    is_active: !!data.is_active,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/dashboard/trust-items"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع للقائمة
      </Link>
      <div>
        <h1 className="text-2xl font-bold">تعديل العنصر</h1>
        <p className="text-sm text-muted-foreground font-mono">{data.id}</p>
      </div>
      <TrustItemForm initial={initial} />
    </div>
  );
}
