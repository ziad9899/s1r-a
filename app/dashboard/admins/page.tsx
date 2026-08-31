import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ADMIN_TIER_LABELS_AR,
  type AdminTier,
} from "@/lib/admin-roles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { AdminActionsMenu } from "./admin-actions-menu";

type AdminRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  role: AdminTier;
  created_at: string;
};

const AR_DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const ROLE_BADGE: Record<AdminTier, string> = {
  super_admin: "bg-rose-100 text-rose-900 border-rose-300",
  admin: "bg-indigo-100 text-indigo-900 border-indigo-300",
  manager: "bg-sky-100 text-sky-900 border-sky-300",
  staff: "bg-emerald-100 text-emerald-900 border-emerald-300",
};

export default async function AdminsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  const callerId = caller?.id ?? null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, role, created_at")
    .in("role", ["super_admin", "admin", "manager", "staff"])
    .order("role", { ascending: true })
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as AdminRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة الصلاحيات</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} مسؤول · {rows.filter((r) => r.role === "super_admin").length} مسؤول أعلى
          </p>
        </div>
        <Link
          href="/dashboard/admins/new"
          className={buttonVariants({ variant: "default" })}
        >
          <Plus className="size-4" />
          إضافة مسؤول
        </Link>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>تاريخ الإضافة</TableHead>
              <TableHead className="w-12 text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-destructive">
                  تعذّر جلب البيانات: {error.message}
                </TableCell>
              </TableRow>
            )}
            {!error && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-12"
                >
                  لا يوجد مسؤولين بعد.
                </TableCell>
              </TableRow>
            )}
            {rows.map((u) => {
              const fullName = [u.first_name, u.last_name]
                .filter(Boolean)
                .join(" ");
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {fullName || "—"}
                    {u.id === callerId && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        (أنت)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    {u.phone}
                  </TableCell>
                  <TableCell>
                    <Badge className={ROLE_BADGE[u.role]}>
                      {ADMIN_TIER_LABELS_AR[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {AR_DATE.format(new Date(u.created_at))}
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminActionsMenu
                      userId={u.id}
                      fullName={fullName}
                      currentRole={u.role}
                      isSelf={u.id === callerId}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
