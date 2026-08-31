import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BOOKING_STATUSES,
  STATUS_LABELS,
  formatBookingDate,
  formatPrice,
  customerFullName,
  profileMatchesQuery,
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
import { BookingsSearch } from "./bookings-search";
import { exportBookingsCsv } from "./export-actions";

const PAGE_SIZE = 20;

type SearchParams = {
  page?: string;
  status?: string;
  branch?: string;
  q?: string;
};

// Build a bookings URL that preserves the other active filters. Passing
// `null` clears that filter; a value sets it. `page` always resets to 1 so a
// filter change never lands on an out-of-range page. The active search query
// is always carried along (undefined → keep current).
function bookingsHref(
  current: { status: string; branch: string; q: string },
  patch: { status?: string | null; branch?: string | null; q?: string | null },
) {
  const status = patch.status === undefined ? current.status : patch.status;
  const branch = patch.branch === undefined ? current.branch : patch.branch;
  const q = patch.q === undefined ? current.q : patch.q;
  const qs = new URLSearchParams();
  if (status && status !== "all") qs.set("status", status);
  if (branch && branch !== "all") qs.set("branch", branch);
  if (q) qs.set("q", q);
  const s = qs.toString();
  return s ? `/dashboard/bookings?${s}` : "/dashboard/bookings";
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = (params.status ?? "all") as BookingStatus | "all";
  const branch = params.branch ?? "all";
  const q = (params.q ?? "").trim();

  const supabase = await createSupabaseServerClient();

  // Branch chips are driven by the live branches list (so a newly-added branch
  // shows up as a filter automatically). Only shown when there's more than one.
  const { data: branchList } = await supabase
    .from("branches")
    .select("id,name")
    .order("sort_order");
  const branches = branchList ?? [];

  // Name/phone live on the customer profile, not on `bookings`. When searching,
  // resolve the query to the set of matching customer ids first, then constrain
  // bookings to them. We go through the same `admin_list_users` RPC the users
  // page uses (SECURITY DEFINER, returns the FULL set in one shot) rather than a
  // direct `profiles` select — a plain select would silently cap at PostgREST's
  // max-rows limit and make older customers unsearchable. Phone matching is
  // Saudi-normalized so "0501…", "+966501…" and "501…" all hit the same number.
  // `matchedIds === null` means "no search" (don't constrain).
  const MAX_MATCH = 1000; // bounds the .in(...) URL length; far above real name/phone hits at this scale
  let matchedIds: string[] | null = null;
  let searchUsers: CustomerProfile[] | null = null; // reused for hydration during a search
  if (q) {
    const { data: userRows } = await supabase.rpc("admin_list_users");
    searchUsers = (userRows ?? []) as CustomerProfile[];
    matchedIds = searchUsers
      .filter((p) => profileMatchesQuery(p, q))
      .map((p) => p.id)
      .slice(0, MAX_MATCH);
  }

  // Count first (respecting every filter) so we can clamp the page before
  // fetching a range — a stale/bookmarked ?page=5 on a 1-page result must never
  // show an empty table under a "صفحة 5 من 1" footer while results exist.
  let countQuery = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true });
  if (status !== "all") countQuery = countQuery.eq("status", status);
  if (branch !== "all") countQuery = countQuery.eq("branch_id", branch);
  // An empty match set must yield zero rows, not "all rows" — so still apply the
  // filter even when nothing matched.
  if (matchedIds !== null) countQuery = countQuery.in("user_id", matchedIds);
  const { count } = await countQuery;

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  let query = supabase
    .from("bookings")
    .select("*")
    .order("scheduled_at", { ascending: false })
    .range((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE - 1);
  if (status !== "all") query = query.eq("status", status);
  if (branch !== "all") query = query.eq("branch_id", branch);
  if (matchedIds !== null) query = query.in("user_id", matchedIds);

  const { data, error } = await query;
  const rows = (data ?? []) as BookingRow[];

  // Hydrate customer profiles for the visible page. During a search we already
  // hold the full user set from the RPC above, so reuse it instead of a second
  // round-trip; otherwise fetch just the visible page's profiles.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const profileMap = new Map<string, CustomerProfile>();
  if (searchUsers) {
    const wanted = new Set(userIds);
    for (const p of searchUsers) if (wanted.has(p.id)) profileMap.set(p.id, p);
  } else if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,phone,saved_vehicle,created_at")
      .in("id", userIds);
    for (const p of (profiles ?? []) as CustomerProfile[]) profileMap.set(p.id, p);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الحجوزات</h1>
          <p className="text-sm text-muted-foreground">
            {q ? (
              <>
                {count ?? 0} نتيجة لبحث «{q}»
              </>
            ) : (
              <>{count ?? 0} حجز إجمالاً</>
            )}
          </p>
        </div>
        <ExportButton action={exportBookingsCsv} />
      </div>

      <BookingsSearch />

      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="الكل"
          href={bookingsHref({ status, branch, q }, { status: "all" })}
          active={status === "all"}
        />
        {BOOKING_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={STATUS_LABELS[s]}
            href={bookingsHref({ status, branch, q }, { status: s })}
            active={status === s}
          />
        ))}
      </div>

      {branches.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">الفرع:</span>
          <FilterChip
            label="كل الفروع"
            href={bookingsHref({ status, branch, q }, { branch: "all" })}
            active={branch === "all"}
          />
          {branches.map((b) => (
            <FilterChip
              key={b.id}
              label={b.name}
              href={bookingsHref({ status, branch, q }, { branch: b.id })}
              active={branch === b.id}
            />
          ))}
        </div>
      )}

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
                  {q ? "لا توجد نتائج مطابقة للبحث." : "لا توجد حجوزات بعد."}
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
            href={pageHref(safePage - 1, status, branch, q)}
            disabled={safePage === 1}
            label="السابق"
          />
          <span className="text-sm text-muted-foreground">
            صفحة {safePage} من {totalPages}
          </span>
          <PageLink
            href={pageHref(safePage + 1, status, branch, q)}
            disabled={safePage >= totalPages}
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

function pageHref(
  page: number,
  status: BookingStatus | "all",
  branch: string,
  q: string,
) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (status !== "all") params.set("status", status);
  if (branch !== "all") params.set("branch", branch);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/dashboard/bookings?${qs}` : "/dashboard/bookings";
}
