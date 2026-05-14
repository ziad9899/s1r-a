import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
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
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">
          بيانات التواصل والـ branding اللي يظهر للعملاء.
        </p>
      </div>
      {error ? (
        <p className="text-destructive">
          تعذّر جلب الإعدادات: {error.message}. تأكّد إنك شغّلت
          migration 0008_app_settings.sql.
        </p>
      ) : (
        <SettingsForm initial={initial} />
      )}
    </div>
  );
}
