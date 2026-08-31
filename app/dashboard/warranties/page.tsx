import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";

import { WarrantyDeleteButton } from "./warranty-delete-button";

type Row = {
  id: string;
  ppf_number: string;
  customer_name: string;
  customer_phone: string;
  duration: string;
  plate_number: string | null;
  issued_at: string | null;
};

const AR_DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function WarrantiesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Only the account manager (super_admin) manages warranties.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if (me?.role !== "super_admin") redirect("/dashboard");

  const { data, error } = await supabase
    .from("warranties")
    .select(
      "id, ppf_number, customer_name, customer_phone, duration, plate_number, issued_at",
    )
    .order("issued_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الضمانات</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} ضمان · ضمانات حماية PPF تظهر في حساب العميل بالتطبيق
          </p>
        </div>
        <Link
          href="/dashboard/warranties/new"
          className={buttonVariants({ variant: "default" })}
        >
          <Plus className="size-4" />
          إضافة ضمان
        </Link>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم PPF</TableHead>
              <TableHead>اسم العميل</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>اللوحة</TableHead>
              <TableHead>المدة</TableHead>
              <TableHead>تاريخ الإصدار</TableHead>
              <TableHead className="w-24 text-right">إجراءات</TableHead>
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
                  لا توجد ضمانات بعد.
                </TableCell>
              </TableRow>
            )}
            {rows.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-mono text-xs" dir="ltr">
                  {w.ppf_number}
                </TableCell>
                <TableCell className="font-medium">{w.customer_name}</TableCell>
                <TableCell className="font-mono text-xs" dir="ltr">
                  {w.customer_phone}
                </TableCell>
                <TableCell>{w.plate_number || "—"}</TableCell>
                <TableCell>{w.duration}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {w.issued_at ? AR_DATE.format(new Date(w.issued_at)) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/dashboard/warranties/${w.id}/edit`}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "icon",
                      })}
                      aria-label="تعديل"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <WarrantyDeleteButton
                      id={w.id}
                      label={`${w.customer_name} · ${w.ppf_number}`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
