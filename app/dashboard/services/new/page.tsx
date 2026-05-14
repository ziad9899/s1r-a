import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { NewServiceForm } from "./new-service-form";

export default function NewServicePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/dashboard/services"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع للقائمة
      </Link>
      <div>
        <h1 className="text-2xl font-bold">خدمة جديدة</h1>
        <p className="text-sm text-muted-foreground">
          أدخل الأساسيات الآن. بعد الإنشاء تقدر تضيف الصورة والوصف والـ FAQs
          من صفحة التعديل.
        </p>
      </div>
      <NewServiceForm />
    </div>
  );
}
