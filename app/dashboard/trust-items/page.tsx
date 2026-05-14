import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trustIconEmoji, trustToneSwatch } from "@/lib/trust-icons";

type TrustItemRow = {
  id: string;
  icon_key: string;
  label_ar: string;
  label_en: string;
  tone: string;
  sort_order: number;
  is_active: boolean;
};

export const dynamic = "force-dynamic";

export default async function TrustItemsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trust_items")
    .select("id,icon_key,label_ar,label_en,tone,sort_order,is_active")
    .order("sort_order");

  const rows = (data ?? []) as TrustItemRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لماذا S1R؟ — مزايا الصفحة الرئيسية</h1>
        <p className="text-sm text-muted-foreground">
          الأيقونات الست التي تظهر تحت شبكة الخدمات. عدّل النص أو اختر
          أيقونة ولون مختلف. عدد العناصر ثابت (6).
        </p>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الترتيب</TableHead>
              <TableHead>الأيقونة</TableHead>
              <TableHead>العنوان (عربي)</TableHead>
              <TableHead>العنوان (English)</TableHead>
              <TableHead>اللون</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-destructive">
                  تعذّر جلب البيانات: {error.message}. تأكّد من تشغيل
                  migration 0025_trust_items.sql.
                </TableCell>
              </TableRow>
            )}
            {!error && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  لم تُهيّأ العناصر. شغّل migration 0025_trust_items.sql.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">
                  {r.sort_order}
                </TableCell>
                <TableCell className="text-xl">
                  {trustIconEmoji(r.icon_key)}
                </TableCell>
                <TableCell className="font-medium">{r.label_ar}</TableCell>
                <TableCell dir="ltr" className="text-sm text-muted-foreground">
                  {r.label_en || "—"}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-4 rounded-full border"
                      style={{ backgroundColor: trustToneSwatch(r.tone) }}
                      aria-hidden
                    />
                    <span className="text-xs text-muted-foreground">
                      {r.tone}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  {r.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300">
                      نشط
                    </Badge>
                  ) : (
                    <Badge variant="outline">معطّل</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/trust-items/${r.id}`}
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
