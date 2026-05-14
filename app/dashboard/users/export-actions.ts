"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCallerIsAdmin } from "@/lib/admin-gate";
import { buildCsv, dateStamp } from "@/lib/csv-export";

type Result =
  | { ok: true; filename: string; content: string }
  | { ok: false; error: string };

type UserRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  role: string;
  phone_verified: boolean;
  created_at: string;
  banned_until: string | null;
  email_confirmed_at: string | null;
};

function isPermanent(banned_until: string | null): boolean {
  if (!banned_until) return false;
  return new Date(banned_until).getFullYear() > 9000;
}

function isActiveBan(banned_until: string | null): boolean {
  if (!banned_until) return false;
  return new Date(banned_until).getTime() > Date.now();
}

function statusLabel(u: UserRow): string {
  if (isActiveBan(u.banned_until)) {
    return isPermanent(u.banned_until)
      ? "محظور دائم"
      : `محظور حتى ${u.banned_until}`;
  }
  if (!u.phone_verified) return "لم يوثّق الجوال";
  return "نشط";
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "مسؤول رئيسي",
  admin: "مسؤول",
  manager: "مدير",
  staff: "موظّف",
  customer: "عميل",
};

export async function exportUsersCsv(): Promise<Result> {
  const gate = await assertCallerIsAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createSupabaseServerClient();
  const [usersRes, bookingsRes] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.from("bookings").select("user_id"),
  ]);
  if (usersRes.error) return { ok: false, error: usersRes.error.message };

  const rows = (usersRes.data ?? []) as UserRow[];
  const bookingsByUser = new Map<string, number>();
  for (const b of (bookingsRes.data ?? []) as { user_id: string }[]) {
    bookingsByUser.set(b.user_id, (bookingsByUser.get(b.user_id) ?? 0) + 1);
  }

  const headers = [
    "الاسم",
    "الجوال",
    "الدور",
    "الحالة",
    "عدد الحجوزات",
    "تاريخ الانضمام",
  ];
  const csvRows = rows.map((u) => [
    [u.first_name, u.last_name].filter(Boolean).join(" "),
    u.phone,
    ROLE_LABELS[u.role] ?? u.role,
    statusLabel(u),
    bookingsByUser.get(u.id) ?? 0,
    new Date(u.created_at).toISOString(),
  ]);

  return {
    ok: true,
    filename: `users_${dateStamp()}.csv`,
    content: buildCsv(headers, csvRows),
  };
}
