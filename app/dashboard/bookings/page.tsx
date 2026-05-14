import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BOOKING_STATUSES,
  STATUS_LABELS,
  formatBookingDate,
  formatPrice,
  customerFullName,
  type BookingRow,
  type BookingStatus,
  type CustomerProfile,
} from "@/lib/bookings";
import { vehicleLabel } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportButton } from "@/components/export-button";
import { StatusCell } from "./status-cell";
import { exportBookingsCsv } from "./export-actions";

const PAGE_SIZE = 20;

type SearchParams = {
  page?: string;
  status?: string;
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = (params.status ?? "all") as BookingStatus | "all";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("bookings")
    .select("*", { count: "exact" })
    .order("scheduled_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status !== "all") query = query.eq("status", status);

  const { data, count, error } = await query;
  const rows = (data ?? []) as BookingRow[];

  // Hydrate customer profiles for the visible page only.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const profiles =
    userIds.length === 0
      ? []
      : ((
          await supabase
            .from("profiles")
            .select("id,first_name,last_name,phone,saved_vehicle,created_at")
            .in("id", userIds)
        ).data ?? []);
  const profileMap = new Map<string, CustomerProfile>();
  for (const p of profiles as CustomerProfile[]) profileMap.set(p.id, p);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الحجوزات</h1>
          <p className="text-sm text-muted-foreground">
            {count ?? 0} حجز إجمالاً
          </p>
        </div>
        <ExportButton action={exportBookingsCsv} />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="الكل"
          href="/dashboard/bookings"
          active={status === "all"}
        />
        {BOOKING_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={STATUS_LABELS[s]}
            href={`/dashboard/bookings?status=${s}`}
            active={status === s}
          />
        ))}
      </div>

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العميل</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>الخدمة</TableHead>
              <TableHead>الفرع</TableHead>
              <TableHead>الموعد</TableHead>
              <TableHead>السيارة</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-destructive">
                  تعذّر جلب البيانات: {error.message}
                </TableCell>
              </TableRow>
            )}
            {!error && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-12"
                >
                  لا توجد حجوزات بعد.
                </TableCell>
              </TableRow>
            )}
            {rows.map((b) => {
              const customer = profileMap.get(b.user_id);
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {customerFullName(customer)}
                  </TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    {customer?.phone ?? "—"}
                  </TableCell>
                  <TableCell>{b.service_name}</TableCell>
                  <TableCell>{b.branch_name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatBookingDate(b.scheduled_at)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{vehicleLabel(b.vehicle_type)}</span>
                    {b.vehicle_plate && (
                      <span className="text-xs text-muted-foreground block font-mono">
                        {b.vehicle_plate}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(Number(b.estimated_price_sar))}
                  </TableCell>
                  <TableCell>
                    <StatusCell bookingId={b.id} initial={b.status} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/bookings/${b.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      تفاصيل
                    </Link>
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
            href={pageHref(page - 1, status)}
            disabled={page === 1}
            label="السابق"
          />
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <PageLink
            href={pageHref(page + 1, status)}
            disabled={page >= totalPages}
            label="التالي"
          />
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted"
      }`}
    >
      {label}
    </Link>
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

function pageHref(page: number, status: BookingStatus | "all") {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (status !== "all") params.set("status", status);
  const qs = params.toString();
  return qs ? `/dashboard/bookings?${qs}` : "/dashboard/bookings";
}
