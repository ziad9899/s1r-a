"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TRUST_ICON_OPTIONS,
  TRUST_TONES,
  trustToneSwatch,
} from "@/lib/trust-icons";

import { updateTrustItem, type TrustItemValues } from "./actions";

export function TrustItemForm({ initial }: { initial: TrustItemValues }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<TrustItemValues>(initial);

  function set<K extends keyof TrustItemValues>(
    key: K,
    value: TrustItemValues[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateTrustItem(form);
      if (!res.ok) {
        toast.error(`تعذّر الحفظ: ${res.error}`);
        return;
      }
      toast.success("تمّ الحفظ");
      router.push("/dashboard/trust-items");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>تعديل العنصر</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="icon_key">الأيقونة</Label>
            <select
              id="icon_key"
              value={form.icon_key}
              onChange={(e) => set("icon_key", e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {TRUST_ICON_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.emoji}  —  {o.ar}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="label_ar">العنوان (عربي)</Label>
            <Input
              id="label_ar"
              value={form.label_ar}
              onChange={(e) => set("label_ar", e.target.value)}
              required
              maxLength={30}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="label_en">العنوان (English)</Label>
            <Input
              id="label_en"
              dir="ltr"
              value={form.label_en}
              onChange={(e) => set("label_en", e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tone">اللون</Label>
            <select
              id="tone"
              value={form.tone}
              onChange={(e) => set("tone", e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {TRUST_TONES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <div
              className="size-6 rounded-md border"
              style={{ backgroundColor: trustToneSwatch(form.tone) }}
              aria-hidden
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sort_order">الترتيب</Label>
            <Input
              id="sort_order"
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                set("sort_order", Number(e.target.value) || 0)
              }
              className="max-w-32"
            />
          </div>

          <label className="flex items-center justify-between rounded-md border p-3 cursor-pointer">
            <span>
              <span className="block text-sm font-medium">العنصر نشط</span>
              <span className="block text-xs text-muted-foreground">
                يظهر في تطبيق العميل فقط عند التفعيل.
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="size-4"
            />
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          حفظ التغييرات
        </Button>
      </div>
    </form>
  );
}
