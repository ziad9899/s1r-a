import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SlideRow = {
  id: string;
  image_url: string;
  title_ar: string;
  body_ar: string;
  sort_order: number;
  is_active: boolean;
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("onboarding_slides")
    .select("id,image_url,title_ar,body_ar,sort_order,is_active")
    .order("sort_order");

  const rows = (data ?? []) as SlideRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">شاشات الترحيب</h1>
          <p className="text-sm text-muted-foreground">
            تظهر هذه الشاشات للمستخدم عند فتح التطبيق لأول مرة. الصورة تملأ
            كامل الشاشة (9:16) والنصوص تُكتب فوقها.
          </p>
        </div>
        <Link href="/dashboard/onboarding/new" className={buttonVariants()}>
          <Plus className="size-4" />
          شاشة جديدة
        </Link>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[88px]">الصورة</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead>الشرح</TableHead>
              <TableHead>الترتيب</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-destructive">
                  تعذّر جلب البيانات: {error.message}
                </TableCell>
              </TableRow>
            )}
            {!error && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-12"
                >
                  لا توجد شاشات. اضغط &quot;شاشة جديدة&quot; لإضافة الأولى.
                  حتى يومذاك يعرض التطبيق الشاشات الافتراضية الـ 3.
                </TableCell>
              </TableRow>
            )}
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="relative h-16 w-10 overflow-hidden rounded border bg-muted">
                    <Image
                      src={s.image_url}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </TableCell>
                <TableCell className="font-medium">{s.title_ar}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                  {s.body_ar}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {s.sort_order}
                </TableCell>
                <TableCell>
                  {s.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300">
                      نشط
                    </Badge>
                  ) : (
                    <Badge variant="outline">معطّل</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/onboarding/${s.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    تعديل
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
