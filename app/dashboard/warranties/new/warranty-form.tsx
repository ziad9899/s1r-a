"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addWarranty, updateWarranty } from "../actions";

export type WarrantyInitial = {
  id?: string;
  ppfNumber?: string;
  customerName?: string;
  phoneLocal?: string;
  duration?: string;
  vin?: string;
  carType?: string;
  carInfo?: string;
  plateNumber?: string;
  durationMonths?: number | null;
};

export function WarrantyForm({
  mode = "create",
  initial,
}: {
  mode?: "create" | "edit";
  initial?: WarrantyInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ppfNumber, setPpfNumber] = useState(initial?.ppfNumber ?? "");
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [phoneLocal, setPhoneLocal] = useState(initial?.phoneLocal ?? "");
  const [duration, setDuration] = useState(initial?.duration ?? "10 سنوات");
  const [vin, setVin] = useState(initial?.vin ?? "");
  const [carType, setCarType] = useState(initial?.carType ?? "");
  const [carInfo, setCarInfo] = useState(initial?.carInfo ?? "");
  const [plateNumber, setPlateNumber] = useState(initial?.plateNumber ?? "");
  const [durationMonths, setDurationMonths] = useState(
    initial?.durationMonths != null ? String(initial.durationMonths) : "",
  );

  const isEdit = mode === "edit";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    // Saudi-only phone: +966 + 9-digit local starting with 5 — the same shape
    // the app stores on the customer's profile, so the two match.
    if (!/^5\d{8}$/.test(phoneLocal)) {
      toast.error("رقم جوال العميل غير صالح. أدخل 9 خانات تبدأ بـ 5.");
      return;
    }
    const trimmedMonths = durationMonths.trim();
    let months: number | null = null;
    if (trimmedMonths.length > 0) {
      const n = Number(trimmedMonths);
      if (!Number.isInteger(n) || n < 1 || n > 600) {
        toast.error("مدة الضمان بالأشهر غير صالحة. أدخل عدداً صحيحاً بين 1 و600.");
        return;
      }
      months = n;
    }
    const phoneE164 = `+966${phoneLocal}`;
    startTransition(async () => {
      const result = isEdit
        ? await updateWarranty({
            id: initial!.id!,
            ppfNumber,
            customerName,
            phoneE164,
            duration,
            vin,
            carType,
            carInfo,
            plateNumber,
            durationMonths: months,
          })
        : await addWarranty({
            ppfNumber,
            customerName,
            phoneE164,
            duration,
            vin,
            carType,
            carInfo,
            plateNumber,
            durationMonths: months,
          });
      if (result.ok) {
        toast.success(
          isEdit ? "حُفظت التعديلات" : `أُضيف ضمان ${customerName}`,
        );
        router.push("/dashboard/warranties");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">بيانات الضمان</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ppf">رقم PPF</Label>
            <Input
              id="ppf"
              dir="ltr"
              placeholder="PPF-XXXXX"
              value={ppfNumber}
              onChange={(e) => setPpfNumber(e.target.value)}
              required
              className="font-mono"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="name">اسم العميل</Label>
            <Input
              id="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="phone">جوال العميل (للربط بحسابه في التطبيق)</Label>
            <div className="flex gap-2" dir="ltr">
              <span className="flex items-center rounded-md border bg-muted px-3 text-sm font-mono">
                +966
              </span>
              <Input
                id="phone"
                dir="ltr"
                inputMode="numeric"
                pattern="5\d{8}"
                maxLength={9}
                placeholder="5XXXXXXXX"
                value={phoneLocal}
                onChange={(e) =>
                  setPhoneLocal(e.target.value.replace(/\D/g, "").slice(0, 9))
                }
                required
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              لازم يطابق جوال العميل المسجّل في التطبيق ليظهر له الضمان.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="duration">المدة</Label>
            <Input
              id="duration"
              placeholder="مثال: 10 سنوات"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="durationMonths">مدة الضمان بالأشهر (للعدّاد)</Label>
            <Input
              id="durationMonths"
              dir="ltr"
              inputMode="numeric"
              placeholder="مثال: 120 (١٠ سنوات)"
              value={durationMonths}
              onChange={(e) =>
                setDurationMonths(e.target.value.replace(/\D/g, "").slice(0, 3))
              }
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              تُستخدم لعرض عدّاد الوقت المتبقي في التطبيق. اتركها فارغة لإخفاء
              العدّاد.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="plateNumber">رقم اللوحة</Label>
            <Input
              id="plateNumber"
              placeholder="أ ب ج ١٢٣٤"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="carType">نوع السيارة</Label>
            <Input
              id="carType"
              placeholder="مثال: مرسيدس S-Class 2024"
              value={carType}
              onChange={(e) => setCarType(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="vin">رقم الهيكل (VIN)</Label>
            <Input
              id="vin"
              dir="ltr"
              placeholder="17-character VIN"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="carInfo">معلومات السيارة</Label>
            <Input
              id="carInfo"
              placeholder="مثال: اللون أسود · اللوحة أ ب ج 1234"
              value={carInfo}
              onChange={(e) => setCarInfo(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "حفظ التعديلات" : "إضافة الضمان"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
