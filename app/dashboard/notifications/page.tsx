import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NotificationsForm } from "./notifications-form";
import { NotificationHistory } from "./notification-history";
import { ScheduledList } from "./scheduled-list";

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,first_name,last_name,phone")
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(200);

  const recipients = (data ?? []) as ProfileRow[];

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">الإشعارات الفورية</h1>
        <p className="text-sm text-muted-foreground">
          أرسل أو جدّل إشعاراً لعملائك. اختر فئة، عيّن قالباً، عاين، ثم ابعث.
        </p>
      </div>

      {error ? (
        <p className="text-destructive">
          تعذّر جلب المستخدمين: {error.message}
        </p>
      ) : (
        <NotificationsForm
          recipients={recipients}
          currentUserId={user?.id ?? null}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">المجدولة</h2>
        <ScheduledList />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">السجل (آخر 20 إشعار)</h2>
        <NotificationHistory />
      </section>
    </div>
  );
}
