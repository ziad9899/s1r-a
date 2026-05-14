import Link from "next/link";
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

type FilterRow = {
  id: string;
  label_ar: string;
  label_en: string | null;
  target_service_id: string | null;
  sort_order: number;
  is_active: boolean;
};

type ServiceRow = { id: string; name: string };

export const dynamic = "force-dynamic";

export default async function FiltersPage() {
  const supabase = await createSupabaseServerClient();

  const [filtersRes, servicesRes] = await Promise.all([
    supabase
      .from("service_filters")
      .select("id,label_ar,label_en,target_service_id,sort_order,is_active")
      .order("sort_order"),
    supabase.from("services").select("id,name"),
  ]);

  const rows = (filtersRes.data ?? []) as FilterRow[];
  const services = (servicesRes.data ?? []) as ServiceRow[];
  const serviceNameById = new Map(services.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">فلاتر الصفحة الرئيسية</h1>
          <p className="text-sm text-muted-foreground">
            الـ chips التي تظهر فوق شبكة الخدمات في تطبيق العميل. زر &quot;الكل&quot;
            ثابت ولا يحتاج إعداداً.
          </p>
        </div>
        <Link href="/dashboard/filters/new" className={buttonVariants()}>
          <Plus className="size-4" />
          فلتر جديد
        </Link>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الترتيب</TableHead>
              <TableHead>المسمّى (عربي)</TableHead>
              <TableHead>المسمّى (English)</TableHead>
              <TableHead>الخدمة المستهدفة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtersRes.error && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-destructive">
                  تعذّر جلب البيانات: {filtersRes.error.message}
                </TableCell>
              </TableRow>
            )}
            {!filtersRes.error && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-12"
                >
                  لا توجد فلاتر. سيظهر للعميل زر &quot;الكل&quot; فقط حتى تُضيف
                  الأول.
                </TableCell>
              </TableRow>
            )}
            {rows.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">
                  {f.sort_order}
                </TableCell>
                <TableCell className="font-medium">{f.label_ar}</TableCell>
                <TableCell dir="ltr" className="text-sm text-muted-foreground">
                  {f.label_en || "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {f.target_service_id
                    ? serviceNameById.get(f.target_service_id) ??
                      f.target_service_id
                    : <span className="text-destructive">— غير محدّد</span>}
                </TableCell>
                <TableCell>
                  {f.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300">
                      نشط
                    </Badge>
                  ) : (
                    <Badge variant="outline">معطّل</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/filters/${f.id}`}
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
