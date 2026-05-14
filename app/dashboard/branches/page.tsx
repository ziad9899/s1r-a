import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
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
import { exportBranchesCsv } from "./export-actions";

type BranchRow = {
  id: string;
  name: string;
  name_en: string | null;
  city: string;
  address: string;
  phone: string | null;
  active: boolean;
};

export default async function BranchesPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id,name,name_en,city,address,phone,active")
    .order("sort_order");
  const rows = (data ?? []) as BranchRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الفروع</h1>
          <p className="text-sm text-muted-foreground">
            عناوين الفروع وأرقام التواصل وساعات العمل.
          </p>
        </div>
        <ExportButton action={exportBranchesCsv} />
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الفرع</TableHead>
              <TableHead>المدينة</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead>الجوال</TableHead>
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
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  لا توجد فروع.
                </TableCell>
              </TableRow>
            )}
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="font-medium">{b.name}</div>
                  {b.name_en && (
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {b.name_en}
                    </div>
                  )}
                </TableCell>
                <TableCell>{b.city}</TableCell>
                <TableCell className="text-sm">{b.address}</TableCell>
                <TableCell className="font-mono text-xs" dir="ltr">
                  {b.phone ?? "—"}
                </TableCell>
                <TableCell>
                  {b.active ? (
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300">
                      نشط
                    </Badge>
                  ) : (
                    <Badge variant="outline">معطّل</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/branches/${b.id}`}
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
