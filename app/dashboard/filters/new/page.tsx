import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FilterEditForm } from "../filter-edit-form";

export default function NewFilterPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/dashboard/filters"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع للقائمة
      </Link>
      <div>
        <h1 className="text-2xl font-bold">فئة جديدة</h1>
        <p className="text-sm text-muted-foreground">
          أنشئ فئة جديدة. اربط الخدمات بها لاحقاً من صفحة كل خدمة عبر حقل
          &quot;الفئة&quot;.
        </p>
      </div>
      <FilterEditForm isNew />
    </div>
  );
}
