import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewBranchForm } from "./new-branch-form";

export const dynamic = "force-dynamic";

export default async function NewBranchPage() {
  const supabase = await createSupabaseServerClient();
  // Default the new branch to the end of the list.
  const { data } = await supabase
    .from("branches")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (data?.sort_order ?? 0) + 1;

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
        <h1 className="text-2xl font-bold">إضافة فرع</h1>
        <p className="text-sm text-muted-foreground">
          فرع جديد يظهر للعملاء في التطبيق عند تفعيله.
        </p>
      </div>
      <NewBranchForm nextSortOrder={nextSortOrder} />
    </div>
  );
}
