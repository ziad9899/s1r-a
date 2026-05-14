import Link from "next/link";
import { Plus } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/formatters";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/export-button";
import { exportServicesCsv } from "./export-actions";

type ServiceRow = {
  id: string;
  name: string;
  name_en: string | null;
  starting_price_sar: number;
  duration_label: string | null;
  tag: string | null;
  active: boolean;
  sort_order: number;
};

export default async function ServicesPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id,name,name_en,starting_price_sar,duration_label,tag,active,sort_order",
    )
    .order("sort_order");

  const rows = (data ?? []) as ServiceRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الخدمات</h1>
          <p className="text-sm text-muted-foreground">
            عدّل الأسعار والأسماء والوصف. التغييرات تظهر للعملاء فوراً.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton action={exportServicesCsv} />
          <Link href="/dashboard/services/new" className={buttonVariants()}>
            <Plus className="size-4" />
            خدمة جديدة
          </Link>
        </div>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الترتيب</TableHead>
              <TableHead>الخدمة</TableHead>
              <TableHead>السعر الأساسي</TableHead>
              <TableHead>المدة</TableHead>
              <TableHead>الوسم</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-destructive">
                  تعذّر جلب البيانات: {error.message}
                </TableCell>
              </TableRow>
            )}
            {!error && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-12"
                >
                  لا توجد خدمات. شغّل migration 0007_seed_full.sql.
                </TableCell>
              </TableRow>
            )}
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">
                  {s.sort_order}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{s.name}</div>
                  {s.name_en && (
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {s.name_en}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {formatPrice(s.starting_price_sar)}
                </TableCell>
                <TableCell className="text-sm">
                  {s.duration_label ?? "—"}
                </TableCell>
                <TableCell>
                  {s.tag ? <Badge variant="secondary">{s.tag}</Badge> : "—"}
                </TableCell>
                <TableCell>
                  {s.active ? (
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300">
                      نشط
                    </Badge>
                  ) : (
                    <Badge variant="outline">معطّل</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/services/${s.id}`}
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
