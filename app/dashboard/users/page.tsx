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

import { UserActionsMenu } from "./user-actions-menu";
import { exportUsersCsv } from "./export-actions";
import { UsersSearch } from "./users-search";

const PAGE_SIZE = 20;

type SearchParams = {
  page?: string;
  q?: string;
};

// Normalize a phone string to bare digits with the Saudi country code and any
// leading zero stripped, so 0501234567 / 501234567 / +966501234567 /
// 966501234567 all reduce to the same "501234567".
const normPhone = (s: string) =>
  s.replace(/\D/g, "").replace(/^966/, "").replace(/^0/, "");

type UserRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  role: "customer" | "admin";
  phone_verified: boolean;
  created_at: string;
  banned_until: string | null;
  email_confirmed_at: string | null;
};

const AR_DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const AR_DATETIME = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Supabase represents a permanent ban as a date far in the future. Anything
// past the year 9000 we render as "دائم" rather than the literal date.
function isPermanent(banned_until: string | null): boolean {
  if (!banned_until) return false;
  return new Date(banned_until).getFullYear() > 9000;
}

function isActiveBan(banned_until: string | null): boolean {
  if (!banned_until) return false;
  return new Date(banned_until).getTime() > Date.now();
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = (params.q ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  const callerId = caller?.id ?? null;

  // admin_list_users returns all rows (no server-side paging yet). For the
  // current scale (< 5k users on Pro tier) the full payload is fine; we
  // slice it for display and pagination so the UI stays responsive.
  const [usersRes, bookingsRes] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.from("bookings").select("user_id"),
  ]);
  const allRows = (usersRes.data ?? []) as UserRow[];

  // Filter server-side over the full set (before pagination) so search covers
  // every user, matching by name (case-insensitive substring) OR phone (with
  // Saudi country/leading-zero normalized on both sides).
  let filtered = allRows;
  if (q) {
    const ql = q.toLowerCase();
    const qHasDigit = /\d/.test(q);
    const qPhone = qHasDigit ? normPhone(q) : "";
    filtered = allRows.filter((u) => {
      const first = (u.first_name ?? "").toLowerCase();
      const last = (u.last_name ?? "").toLowerCase();
      const full = [u.first_name, u.last_name].filter(Boolean).join(" ").toLowerCase();
      const nameMatch =
        full.includes(ql) || first.includes(ql) || last.includes(ql);
      const phoneMatch =
        qHasDigit && qPhone.length > 0 && normPhone(u.phone ?? "").includes(qPhone);
      return nameMatch || phoneMatch;
    });
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const bookingsByUser = new Map<string, number>();
  for (const b of (bookingsRes.data ?? []) as { user_id: string }[]) {
    bookingsByUser.set(b.user_id, (bookingsByUser.get(b.user_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">المستخدمين</h1>
            <p className="text-sm text-muted-foreground">
              {q ? (
                <>
                  {total} نتيجة لبحث «{q}»
                </>
              ) : (
                <>{total} مستخدم مسجّل</>
              )}
            </p>
          </div>
          <ExportButton action={exportUsersCsv} />
        </div>
        <UsersSearch />
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الحجوزات</TableHead>
              <TableHead>تاريخ الانضمام</TableHead>
              <TableHead className="w-12 text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersRes.error && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-destructive">
                  تعذّر جلب البيانات: {usersRes.error.message}
                </TableCell>
              </TableRow>
            )}
            {!usersRes.error && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  {q ? "لا توجد نتائج مطابقة للبحث." : "لا يوجد مستخدمين بعد."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((u) => {
              const fullName = [u.first_name, u.last_name]
                .filter(Boolean)
                .join(" ");
              const banned = isActiveBan(u.banned_until);
              const permanent = isPermanent(u.banned_until);
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{fullName}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    {u.phone}
                  </TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300">
                        مسؤول
                      </Badge>
                    ) : (
                      <Badge variant="outline">عميل</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {banned ? (
                      <Badge className="bg-rose-100 text-rose-900 border-rose-300">
                        {permanent
                          ? "محظور دائم"
                          : `محظور حتى ${AR_DATETIME.format(new Date(u.banned_until!))}`}
                      </Badge>
                    ) : u.phone_verified ? (
                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300">
                        نشط
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300">
                        لم يوثّق الجوال
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {bookingsByUser.get(u.id) ?? 0}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {AR_DATE.format(new Date(u.created_at))}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActionsMenu
                      userId={u.id}
                      phone={u.phone}
                      fullName={fullName}
                      isBanned={banned}
                      isSelf={u.id === callerId}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <PageLink
            href={pageHref(safePage - 1, q)}
            disabled={safePage === 1}
            label="السابق"
          />
          <span className="text-sm text-muted-foreground">
            صفحة {safePage} من {totalPages}
          </span>
          <PageLink
            href={pageHref(safePage + 1, q)}
            disabled={safePage >= totalPages}
            label="التالي"
          />
        </div>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border bg-background px-3 py-1.5 text-xs text-muted-foreground opacity-50">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-muted"
    >
      {label}
    </Link>
  );
}

function pageHref(page: number, q: string) {
  const parts: string[] = [];
  if (q) parts.push(`q=${encodeURIComponent(q)}`);
  if (page > 1) parts.push(`page=${page}`);
  return parts.length ? `/dashboard/users?${parts.join("&")}` : "/dashboard/users";
}
