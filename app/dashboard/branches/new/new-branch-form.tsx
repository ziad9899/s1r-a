"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// weekday ordering matches DateTime.weekday (1 = Monday … 7 = Sunday), Saturday
// first (Saudi workweek). Mirrors branch-edit-form so a branch is created with
// its hours in one step; the same edit form tweaks them later.
const DAYS: { weekday: number; label: string }[] = [
  { weekday: 6, label: "السبت" },
  { weekday: 7, label: "الأحد" },
  { weekday: 1, label: "الإثنين" },
  { weekday: 2, label: "الثلاثاء" },
  { weekday: 3, label: "الأربعاء" },
  { weekday: 4, label: "الخميس" },
  { weekday: 5, label: "الجمعة" },
];

type SlotState = { open: string; close: string; closed: boolean };

const initialSlots = (): Record<number, SlotState> => {
  const out: Record<number, SlotState> = {};
  for (const { weekday } of DAYS) {
    // Sensible default: open Sat–Thu 10:00→00:00, Friday closed.
    out[weekday] = { open: "10:00", close: "00:00", closed: weekday === 5 };
  }
  return out;
};

type Meta = {
  id: string;
  name: string;
  name_en: string;
  city: string;
  city_en: string;
  address: string;
  address_en: string;
  phone: string;
  maps_url: string;
  sort_order: number;
  active: boolean;
};

const EMPTY: Meta = {
  id: "",
  name: "",
  name_en: "",
  city: "",
  city_en: "",
  address: "",
  address_en: "",
  phone: "",
  maps_url: "",
  sort_order: 1,
  active: true,
};

// A branch id is a human slug (the table PK is text, e.g. "sir-riyadh"), so we
// derive one from the English name and let the admin override it.
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function NewBranchForm({ nextSortOrder }: { nextSortOrder: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Meta>({ ...EMPTY, sort_order: nextSortOrder });
  const [idTouched, setIdTouched] = useState(false);
  const [slots, setSlots] = useState<Record<number, SlotState>>(initialSlots());

  function set<K extends keyof Meta>(key: K, value: Meta[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setSlot(weekday: number, patch: Partial<SlotState>) {
    setSlots((s) => ({ ...s, [weekday]: { ...s[weekday], ...patch } }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = (idTouched ? form.id : slugify(form.name_en || form.id)).trim();
    if (!id || !/^[a-z0-9-]+$/.test(id)) {
      toast.error("المعرّف (id) لازم إنجليزي صغير بدون مسافات، مثل: sir-jeddah");
      return;
    }
    if (!form.name.trim() || !form.city.trim() || !form.address.trim()) {
      toast.error("الاسم والمدينة والعنوان (عربي) مطلوبة.");
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();

      // Guard against a duplicate id before insert for a clean message.
      const { data: existing } = await supabase
        .from("branches")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (existing) {
        toast.error(`المعرّف "${id}" مستخدم بالفعل، اختر غيره.`);
        return;
      }

      const { error: branchErr } = await supabase.from("branches").insert({
        id,
        name: form.name,
        name_en: form.name_en || null,
        city: form.city,
        city_en: form.city_en || null,
        address: form.address,
        address_en: form.address_en || null,
        phone: form.phone || null,
        maps_url: form.maps_url || null,
        active: form.active,
        sort_order: Number(form.sort_order),
      });
      if (branchErr) {
        toast.error(`تعذّر إنشاء الفرع: ${branchErr.message}`);
        return;
      }

      const upserts = [];
      for (const { weekday, label } of DAYS) {
        const s = slots[weekday];
        if (s.closed) continue;
        if (!s.open || !s.close) {
          toast.error(`عبّئ ساعات ${label} أو حدّده مغلقاً.`);
          return;
        }
        const isMidnightClose = s.close === "00:00";
        if (!isMidnightClose && s.close <= s.open) {
          toast.error(`${label}: وقت الإغلاق لازم بعد وقت الفتح. (أو 00:00)`);
          return;
        }
        upserts.push({
          branch_id: id,
          weekday,
          open_time: s.open,
          close_time: s.close,
        });
      }
      if (upserts.length) {
        const { error: hoursErr } = await supabase
          .from("branch_hours")
          .insert(upserts);
        if (hoursErr) {
          toast.error(`أُنشئ الفرع لكن تعذّر حفظ الساعات: ${hoursErr.message}`);
          router.push(`/dashboard/branches/${id}`);
          return;
        }
      }

      toast.success("تمّ إنشاء الفرع");
      router.push("/dashboard/branches");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>بيانات الفرع</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-2">
          <Field label="الاسم (عربي)" value={form.name} onChange={(v) => set("name", v)} />
          <Field
            label="الاسم (English)"
            ltr
            value={form.name_en}
            onChange={(v) => {
              set("name_en", v);
              if (!idTouched) set("id", slugify(v));
            }}
          />
          <Field label="المدينة (عربي)" value={form.city} onChange={(v) => set("city", v)} />
          <Field label="المدينة (English)" ltr value={form.city_en} onChange={(v) => set("city_en", v)} />
          <Field
            label="العنوان (عربي)"
            value={form.address}
            onChange={(v) => set("address", v)}
            className="col-span-2"
          />
          <Field
            label="العنوان (English)"
            ltr
            value={form.address_en}
            onChange={(v) => set("address_en", v)}
            className="col-span-2"
          />
          <Field label="الجوال" ltr value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="رابط Google Maps" ltr value={form.maps_url} onChange={(v) => set("maps_url", v)} />
          <Field
            label="المعرّف id (إنجليزي، للنظام)"
            ltr
            value={form.id}
            onChange={(v) => {
              setIdTouched(true);
              set("id", v);
            }}
          />
          <Field
            label="ترتيب العرض"
            type="number"
            value={String(form.sort_order)}
            onChange={(v) => set("sort_order", Number(v))}
          />
          <div className="flex items-end gap-3 col-span-2">
            <input
              id="active"
              type="checkbox"
              className="size-4"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
            />
            <Label htmlFor="active" className="cursor-pointer">
              مفعّل (يظهر للعملاء)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ساعات العمل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[100px_1fr_1fr_auto] items-center gap-3 text-xs text-muted-foreground mb-2 px-1">
            <span>اليوم</span>
            <span>الافتتاح</span>
            <span>الإغلاق</span>
            <span>مغلق</span>
          </div>
          <div className="grid gap-2">
            {DAYS.map(({ weekday, label }) => {
              const s = slots[weekday];
              return (
                <div
                  key={weekday}
                  className="grid grid-cols-[100px_1fr_1fr_auto] items-center gap-3"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <Input
                    type="time"
                    dir="ltr"
                    value={s.open}
                    disabled={s.closed}
                    onChange={(e) => setSlot(weekday, { open: e.target.value })}
                  />
                  <Input
                    type="time"
                    dir="ltr"
                    value={s.close}
                    disabled={s.closed}
                    onChange={(e) => setSlot(weekday, { close: e.target.value })}
                  />
                  <input
                    type="checkbox"
                    className="size-4 mx-3"
                    checked={s.closed}
                    onChange={(e) => setSlot(weekday, { closed: e.target.checked })}
                    aria-label={`${label} مغلق`}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            وقت الإغلاق 00:00 = منتصف الليل. يمكن ضبط أي وقت بالدقائق (مثال 14:30).
            مدة الفاصل بين المواعيد تُضبط من أعلى صفحة «الفروع».
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          إنشاء الفرع
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ltr,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  ltr?: boolean;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Input
        type={type}
        dir={ltr ? "ltr" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
