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

type BannerRow = {
  id: string;
  image_url: string;
  title_ar: string | null;
  target_type: string;
  target_value: string | null;
  sort_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
};

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("banners")
    .select(
      "id,image_url,title_ar,target_type,target_value,sort_order,is_active,start_at,end_at",
    )
    .order("sort_order");

  const rows = (data ?? []) as BannerRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">البنرات</h1>
          <p className="text-sm text-muted-foreground">
            البنرات المنشورة تظهر في الـ carousel على الصفحة الرئيسية للتطبيق.
            ينصح بألا يتجاوز الإجمالي 5 لأفضل تجربة.
          </p>
        </div>
        <Link href="/dashboard/banners/new" className={buttonVariants()}>
          <Plus className="size-4" />
          بنر جديد
        </Link>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[88px]">الصورة</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead>الهدف</TableHead>
              <TableHead>الترتيب</TableHead>
              <TableHead>الجدولة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-destructive">
                  تعذّر جلب البيانات: {error.message}
                </TableCell>
              </TableRow>
            )}
            {!error && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  لا توجد بنرات. اضغط &quot;بنر جديد&quot; لإضافة الأول.
                </TableCell>
              </TableRow>
            )}
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="relative h-12 w-20 overflow-hidden rounded border bg-muted">
                    <Image
                      src={b.image_url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </TableCell>
                <TableCell>{b.title_ar || "—"}</TableCell>
                <TableCell className="text-xs">
                  {targetLabel(b.target_type, b.target_value)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {b.sort_order}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {scheduleLabel(b.start_at, b.end_at)}
                </TableCell>
                <TableCell>
                  {b.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300">
                      نشط
                    </Badge>
                  ) : (
                    <Badge variant="outline">معطّل</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/banners/${b.id}`}
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

function targetLabel(type: string, value: string | null): string {
  switch (type) {
    case "service":
      return `خدمة: ${value ?? "—"}`;
    case "route":
      return `مسار: ${value ?? "—"}`;
    case "external_url":
      return `رابط خارجي`;
    default:
      return "بدون";
  }
}

function scheduleLabel(start: string | null, end: string | null): string {
  if (!start && !end) return "دائم";
  const fmt = (d: string) => new Date(d).toLocaleDateString("ar-SA");
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return `من ${fmt(start)}`;
  return `حتى ${fmt(end!)}`;
}
