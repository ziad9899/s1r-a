import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LegalForm } from "./legal-form";

export default async function LegalPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("app_settings").select("key,value");
  const initial: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: string | null }[]) {
    initial[row.key] = row.value ?? "";
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">الصفحات النظامية</h1>
        <p className="text-sm text-muted-foreground">
          الرقم الضريبي، وسياسة الخصوصية، والشروط والأحكام — كما تظهر داخل
          التطبيق. اترك نص السياسة/الشروط فارغاً لعرض النص الافتراضي المدمج.
        </p>
      </div>
      {error ? (
        <p className="text-destructive">
          تعذّر جلب الإعدادات: {error.message}. تأكّد إنك شغّلت
          migration 0008_app_settings.sql.
        </p>
      ) : (
        <LegalForm initial={initial} />
      )}
    </div>
  );
}
