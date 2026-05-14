import { redirect } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { IdleTimeout } from "@/components/idle-timeout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminTier } from "@/lib/admin-roles";

const ADMIN_TIERS: readonly string[] = [
  "super_admin",
  "admin",
  "manager",
  "staff",
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role as AdminTier | undefined;
  if (!role || !ADMIN_TIERS.includes(role)) {
    redirect("/login?error=not-admin");
  }

  return (
    <div className="grid min-h-screen w-full grid-cols-[260px_1fr]">
      <IdleTimeout />
      <Sidebar role={role} />
      <div className="flex min-h-screen flex-col">
        <Header email={user.email ?? ""} />
        <main className="flex-1 px-6 py-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
