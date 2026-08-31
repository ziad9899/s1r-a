import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupportForm } from "./support-form";

export default async function SupportPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("app_settings").select("key,value");
  const initial: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: string | null }[]) {
    initial[row.key] = row.value ?? "";
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">تواصل مع الدعم</h1>
        <p className="text-sm text-muted-foreground">
          بيانات التواصل اللي تظهر في صفحة «تواصل مع الدعم» داخل التطبيق (الهاتف،
          واتساب، البريد، ساعات العمل، العنوان). التعديل يظهر في التطبيق فوراً.
        </p>
      </div>
      {error ? (
        <p className="text-destructive">
          تعذّر جلب الإعدادات: {error.message}. تأكّد إنك شغّلت
          migration 0008_app_settings.sql.
        </p>
      ) : (
        <SupportForm initial={initial} />
      )}
    </div>
  );
}
