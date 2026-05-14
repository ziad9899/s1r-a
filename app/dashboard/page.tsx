import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardHome() {
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Run the four KPI queries in parallel.
  const [todayBookings, weekRevenue, totalUsers, upcomingCount] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", today.toISOString())
        .lt(
          "scheduled_at",
          new Date(today.getTime() + 24 * 3600 * 1000).toISOString(),
        ),
      supabase
        .from("bookings")
        .select("estimated_price_sar")
        .eq("status", "completed")
        .gte("scheduled_at", weekAgo.toISOString()),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", today.toISOString())
        .in("status", ["pending", "confirmed"]),
    ]);

  const revenue =
    weekRevenue.data?.reduce(
      (sum, row) => sum + Number(row.estimated_price_sar ?? 0),
      0,
    ) ?? 0;

  const cards = [
    { label: "حجوزات اليوم", value: todayBookings.count ?? 0 },
    { label: "إيرادات الأسبوع (ر.س)", value: revenue.toLocaleString("en-US") },
    { label: "المستخدمين", value: totalUsers.count ?? 0 },
    { label: "حجوزات قادمة", value: upcomingCount.count ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الرئيسية</h1>
        <p className="text-sm text-muted-foreground">
          نظرة عامة سريعة على الحجوزات والإيرادات.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
