import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WarrantyForm } from "./warranty-form";

export default async function NewWarrantyPage() {
  // Page-level super_admin gate — the sidebar hides the link, but a direct URL
  // must not reach the form for a lower tier.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if (me?.role !== "super_admin") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إضافة ضمان</h1>
        <p className="text-sm text-muted-foreground">
          يُضاف الضمان يدوياً عند حضور العميل للمركز. يظهر تلقائياً في حساب
          العميل داخل التطبيق (مطابقةً بجواله).
        </p>
      </div>
      <WarrantyForm />
    </div>
  );
}
