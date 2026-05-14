import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Car,
  MapPin,
  Phone,
  Map as MapIcon,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  STATUS_LABELS,
  STATUS_TONES,
  formatBookingDate,
  formatPrice,
  customerFullName,
  type BookingRow,
  type CustomerProfile,
} from "@/lib/bookings";
import { vehicleLabel } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusCell } from "../status-cell";
import { WhatsAppMenu } from "./whatsapp-menu";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  duration_label: string | null;
  rating: number;
  warranty: string | null;
  features: unknown;
};

type BranchRow = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  maps_url: string | null;
};

type AuditRow = {
  id: number;
  at: string;
  actor_id: string | null;
  actor_role: string | null;
  action: "insert" | "update" | "delete";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

const AR_FULL = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const AR_RELATIVE = new Intl.RelativeTimeFormat("ar-SA-u-nu-latn", {
  numeric: "auto",
});

function relative(iso: string): string {
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(diffMin) < 60) return AR_RELATIVE.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return AR_RELATIVE.format(diffHr, "hour");
  return AR_RELATIVE.format(Math.round(diffHr / 24), "day");
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!bookingRaw) notFound();
  const booking = bookingRaw as BookingRow;

  // Parallel hydration of customer + branch + service + audit + customer's
  // total bookings count.
  const [
    customerRes,
    branchRes,
    serviceRes,
    auditRes,
    customerStatsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,first_name,last_name,phone,saved_vehicle,created_at")
      .eq("id", booking.user_id)
      .maybeSingle(),
    supabase
      .from("branches")
      .select("id,name,city,address,phone,maps_url")
      .eq("id", booking.branch_id)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id,name,description,duration_label,rating,warranty,features")
      .eq("id", booking.service_id)
      .maybeSingle(),
    supabase
      .from("audit_log")
      .select("id,at,actor_id,actor_role,action,old_data,new_data")
      .eq("table_name", "bookings")
      .eq("record_id", id)
      .order("at", { ascending: false })
      .limit(10),
    supabase
      .from("bookings")
      .select("id,scheduled_at,status", { count: "exact" })
      .eq("user_id", booking.user_id),
  ]);

  const customer = (customerRes.data as CustomerProfile | null) ?? null;
  const branch = (branchRes.data as BranchRow | null) ?? null;
  const service = (serviceRes.data as ServiceRow | null) ?? null;
  const audit = (auditRes.data as AuditRow[] | null) ?? [];

  const allBookings = (customerStatsRes.data ?? []) as {
    id: string;
    scheduled_at: string;
    status: string;
  }[];
  const totalBookings = customerStatsRes.count ?? allBookings.length;
  const lastVisit =
    allBookings
      .filter((b) => b.id !== booking.id && b.status === "completed")
      .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0]
      ?.scheduled_at ?? null;

  const features = Array.isArray(service?.features)
    ? (service?.features as string[])
    : [];

  const cancellable = isCancellable(booking);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع لقائمة الحجوزات
      </Link>

      {/* Hero strip */}
      <div className="rounded-lg border bg-background p-5 flex flex-wrap items-start gap-4 justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_TONES[booking.status]}`}
            >
              {STATUS_LABELS[booking.status]}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              #{booking.id}
            </span>
          </div>
          <div className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="size-5 text-muted-foreground" />
            {AR_FULL.format(new Date(booking.scheduled_at))}
          </div>
          <p className="text-sm text-muted-foreground">
            {booking.service_name} · {booking.branch_name} · {relative(booking.scheduled_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusCell bookingId={booking.id} initial={booking.status} />
          {customer?.phone && (
            <>
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-muted"
              >
                <Phone className="size-3.5" />
                اتصال
              </a>
              <WhatsAppMenu booking={booking} customer={customer} />
            </>
          )}
        </div>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main column */}
        <div className="space-y-4">
          {/* Service */}
          <Card>
            <CardHeader>
              <CardTitle>الخدمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="font-medium">{booking.service_name}</div>
                {service?.description && (
                  <p className="text-sm text-muted-foreground mt-1 leading-7">
                    {service.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <KV label="المدّة المتوقّعة" value={service?.duration_label ?? "—"} />
                <KV
                  label="السعر النهائي"
                  value={formatPrice(Number(booking.estimated_price_sar))}
                  bold
                />
                {service?.warranty && (
                  <KV label="الضمان" value={service.warranty} className="col-span-2" />
                )}
              </div>
              {features.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">
                    ما يشمله
                  </div>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    {features.slice(0, 5).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="size-4" />
                السيارة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <KV label="النوع" value={vehicleLabel(booking.vehicle_type)} />
                <KV label="سنة الصنع" value={booking.vehicle_year?.toString() ?? "—"} />
                <KV
                  label="رقم اللوحة"
                  value={booking.vehicle_plate ?? "—"}
                  ltr
                />
                <KV label="اللون" value={booking.color ?? "—"} />
              </div>
            </CardContent>
          </Card>

          {/* Branch */}
          {branch && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  الفرع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium">{branch.name}</div>
                <div className="text-sm text-muted-foreground">
                  {branch.address} — {branch.city}
                </div>
                {branch.phone && (
                  <div className="text-sm font-mono" dir="ltr">
                    {branch.phone}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <a
                    href={
                      branch.maps_url ??
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${branch.name} ${branch.address}`)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    <MapIcon className="size-3.5" />
                    فتح في خرائط جوجل
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer notes */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle>ملاحظات العميل</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 whitespace-pre-wrap">
                  {booking.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Audit log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4" />
                سجل التغييرات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لا يوجد تغييرات مسجّلة.
                </p>
              ) : (
                <ol className="space-y-3">
                  {audit.map((a) => (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <div className="shrink-0 size-2 mt-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <div className="font-medium">
                          {auditSummary(a)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {AR_FULL.format(new Date(a.at))} ·{" "}
                          {a.actor_role ?? "—"}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side rail — customer */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>العميل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="font-bold text-lg">
                  {customerFullName(customer)}
                </div>
                {customer?.phone && (
                  <div className="font-mono text-sm text-muted-foreground" dir="ltr">
                    {customer.phone}
                  </div>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="إجمالي الحجوزات" value={String(totalBookings)} />
                <Stat
                  label="آخر زيارة"
                  value={lastVisit ? AR_FULL.format(new Date(lastVisit)).split(" ").slice(0, 3).join(" ") : "—"}
                />
              </div>
              {customer?.created_at && (
                <div className="text-xs text-muted-foreground">
                  عضو منذ {AR_FULL.format(new Date(customer.created_at)).split(" ").slice(0, 3).join(" ")}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>تفاصيل إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <KV
                label="تاريخ الإنشاء"
                value={AR_FULL.format(new Date(booking.created_at))}
              />
              <KV
                label="حالة الإلغاء"
                value={
                  cancellable
                    ? "متاح حتى 6 ساعات قبل الموعد"
                    : "غير متاح (فات الميعاد أو ضمن الـ 6 ساعات)"
                }
              />
              {cancellable ? (
                <CheckCircle className="size-4 text-emerald-600 inline" />
              ) : (
                <XCircle className="size-4 text-zinc-400 inline" />
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function KV({
  label,
  value,
  bold,
  ltr,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  ltr?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        dir={ltr ? "ltr" : undefined}
        className={`${bold ? "font-bold" : "font-medium"} ${ltr ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-2.5">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function isCancellable(b: BookingRow): boolean {
  if (!["pending", "confirmed", "in_progress"].includes(b.status)) return false;
  const hoursLeft =
    (new Date(b.scheduled_at).getTime() - Date.now()) / (1000 * 3600);
  return hoursLeft > 6;
}

function auditSummary(a: AuditRow): string {
  if (a.action === "insert") return "تم إنشاء الحجز";
  if (a.action === "delete") return "تم حذف الحجز";
  // action === update — try to surface what changed
  const oldStatus = (a.old_data?.status ?? "") as string;
  const newStatus = (a.new_data?.status ?? "") as string;
  if (oldStatus && newStatus && oldStatus !== newStatus) {
    const oldLabel = STATUS_LABELS[oldStatus as keyof typeof STATUS_LABELS] ?? oldStatus;
    const newLabel = STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS] ?? newStatus;
    return `الحالة: ${oldLabel} ← ${newLabel}`;
  }
  return "تم تحديث الحجز";
}
