import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BranchEditForm, type HourRow } from "./branch-edit-form";

export const dynamic = "force-dynamic";

export default async function BranchEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [branchRes, hoursRes] = await Promise.all([
    supabase.from("branches").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("branch_hours")
      .select("weekday,open_time,close_time")
      .eq("branch_id", id),
  ]);

  if (!branchRes.data) notFound();

  const hoursByWeekday = new Map<number, { open_time: string; close_time: string }>();
  for (const row of (hoursRes.data ?? []) as HourRow[]) {
    hoursByWeekday.set(row.weekday, {
      open_time: row.open_time,
      close_time: row.close_time,
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/dashboard/branches"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع للقائمة
      </Link>
      <div>
        <h1 className="text-2xl font-bold">تعديل الفرع</h1>
        <p className="text-sm text-muted-foreground">{branchRes.data.id}</p>
      </div>
      <BranchEditForm
        branch={branchRes.data}
        hoursByWeekday={Object.fromEntries(hoursByWeekday)}
      />
    </div>
  );
}
