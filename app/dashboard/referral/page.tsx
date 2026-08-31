import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReferralForm } from "./referral-form";

export default async function ReferralPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("key,value");
  const initial: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: string | null }[]) {
    initial[row.key] = row.value ?? "";
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">صفحة دعوة الأصدقاء</h1>
        <p className="text-sm text-muted-foreground">
          النصوص اللي تظهر في صفحة «أكواد الأصدقاء» داخل التطبيق. اتركه فارغاً
          لاستخدام النص الافتراضي.
        </p>
      </div>
      {error ? (
        <p className="text-destructive">
          تعذّر جلب الإعدادات: {error.message}. تأكّد إنك شغّلت
          migration 0008_app_settings.sql.
        </p>
      ) : (
        <ReferralForm initial={initial} />
      )}
    </div>
  );
}
