import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SlideEditForm } from "../slide-edit-form";

export default function NewSlidePage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        href="/dashboard/onboarding"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع للقائمة
      </Link>
      <div>
        <h1 className="text-2xl font-bold">شاشة ترحيب جديدة</h1>
        <p className="text-sm text-muted-foreground">
          ارفع صورة بنسبة 9:16، اكتب عنواناً وشرحاً قصيراً، ثم احفظ.
        </p>
      </div>
      <SlideEditForm isNew />
    </div>
  );
}
