"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertCallerIsSuperAdmin } from "@/lib/admin-gate";

type Result = { ok: true } | { ok: false; error: string };

// Warranties are issued only by the account manager (super_admin) — never by
// admin/manager/staff. The gate is load-bearing: the service-role client below
// bypasses RLS, so the RLS insert policy alone is not what protects this.
// duration_months drives a countdown counter in the customer app. It is
// optional; when provided it must be a sane positive integer (1..600 months).
function parseDurationMonths(
  value: number | null | undefined,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (!Number.isInteger(value) || value < 1 || value > 600) {
    return {
      ok: false,
      error: "مدة الضمان بالأشهر غير صالحة. أدخل عدداً صحيحاً بين 1 و600.",
    };
  }
  return { ok: true, value };
}

export async function addWarranty(input: {
  ppfNumber: string;
  customerName: string;
  phoneE164: string;
  duration: string;
  vin?: string;
  carType?: string;
  carInfo?: string;
  plateNumber?: string;
  durationMonths?: number | null;
}): Promise<Result> {
  const gate = await assertCallerIsSuperAdmin();
  if (!gate.ok) return gate;

  const ppfNumber = input.ppfNumber.trim();
  const customerName = input.customerName.trim();
  const duration = input.duration.trim();
  // Vehicle fields are optional; store null when blank.
  const vin = input.vin?.trim() || null;
  const carType = input.carType?.trim() || null;
  const carInfo = input.carInfo?.trim() || null;
  const plateNumber = input.plateNumber?.trim() || null;

  if (ppfNumber.length < 1) return { ok: false, error: "رقم PPF مطلوب." };
  if (customerName.length < 2) return { ok: false, error: "اسم العميل قصير." };
  if (duration.length < 1) return { ok: false, error: "المدة مطلوبة." };
  // Must match a customer's app phone exactly (E.164) or the warranty will
  // never surface in their app.
  if (!/^\+9665\d{8}$/.test(input.phoneE164)) {
    return { ok: false, error: "رقم الجوال غير صالح. مثال: +9665XXXXXXXX" };
  }
  const months = parseDurationMonths(input.durationMonths);
  if (!months.ok) return months;

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("warranties").insert({
    ppf_number: ppfNumber,
    customer_name: customerName,
    customer_phone: input.phoneE164,
    duration,
    vin,
    car_type: carType,
    car_info: carInfo,
    plate_number: plateNumber,
    duration_months: months.value,
    created_by: gate.callerId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/warranties");
  return { ok: true };
}

export async function updateWarranty(input: {
  id: string;
  ppfNumber: string;
  customerName: string;
  phoneE164: string;
  duration: string;
  vin?: string;
  carType?: string;
  carInfo?: string;
  plateNumber?: string;
  durationMonths?: number | null;
}): Promise<Result> {
  const gate = await assertCallerIsSuperAdmin();
  if (!gate.ok) return gate;

  if (!input.id) return { ok: false, error: "معرّف الضمان مفقود." };

  const ppfNumber = input.ppfNumber.trim();
  const customerName = input.customerName.trim();
  const duration = input.duration.trim();
  // Optional fields: null when blank.
  const vin = input.vin?.trim() || null;
  const carType = input.carType?.trim() || null;
  const carInfo = input.carInfo?.trim() || null;
  const plateNumber = input.plateNumber?.trim() || null;

  if (ppfNumber.length < 1) return { ok: false, error: "رقم PPF مطلوب." };
  if (customerName.length < 2) return { ok: false, error: "اسم العميل قصير." };
  if (duration.length < 1) return { ok: false, error: "المدة مطلوبة." };
  if (!/^\+9665\d{8}$/.test(input.phoneE164)) {
    return { ok: false, error: "رقم الجوال غير صالح. مثال: +9665XXXXXXXX" };
  }
  const months = parseDurationMonths(input.durationMonths);
  if (!months.ok) return months;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("warranties")
    .update({
      ppf_number: ppfNumber,
      customer_name: customerName,
      customer_phone: input.phoneE164,
      duration,
      vin,
      car_type: carType,
      car_info: carInfo,
      plate_number: plateNumber,
      duration_months: months.value,
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/warranties");
  return { ok: true };
}

export async function deleteWarranty(id: string): Promise<Result> {
  const gate = await assertCallerIsSuperAdmin();
  if (!gate.ok) return gate;

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("warranties").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/warranties");
  return { ok: true };
}
