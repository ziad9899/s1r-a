import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WarrantyForm } from "../../new/warranty-form";

export default async function EditWarrantyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const { data: warranty } = await supabase
    .from("warranties")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!warranty) redirect("/dashboard/warranties");

  // The stored phone is E.164 (+9665XXXXXXXX); the form edits the 9-digit local.
  const phoneLocal = String(warranty.customer_phone ?? "").replace(
    /^\+966/,
    "",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تعديل الضمان</h1>
        <p className="text-sm text-muted-foreground">
          عدّل بيانات الضمان. تظهر التعديلات في حساب العميل داخل التطبيق (مطابقةً
          بجواله).
        </p>
      </div>
      <WarrantyForm
        mode="edit"
        initial={{
          id: warranty.id,
          ppfNumber: warranty.ppf_number ?? "",
          customerName: warranty.customer_name ?? "",
          phoneLocal,
          duration: warranty.duration ?? "",
          vin: warranty.vin ?? "",
          carType: warranty.car_type ?? "",
          carInfo: warranty.car_info ?? "",
          plateNumber: warranty.plate_number ?? "",
          durationMonths: warranty.duration_months ?? null,
        }}
      />
    </div>
  );
}
