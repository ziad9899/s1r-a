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

type Branch = {
  id: string;
  name: string;
  name_en: string | null;
  city: string;
  city_en: string | null;
  address: string;
  address_en: string | null;
  phone: string | null;
  maps_url: string | null;
  active: boolean;
  sort_order: number;
};

export type HourRow = {
  weekday: number;
  open_time: string;
  close_time: string;
};

type HoursMap = Record<number, { open_time: string; close_time: string }>;

// weekday ordering matches DateTime.weekday (1 = Monday … 7 = Sunday).
// We render Saturday first because that's the Saudi workweek start.
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

function toLocal(raw: string | undefined): string {
  // PostgreSQL `time` comes back as "HH:MM:SS"; the <input type="time">
  // wants "HH:MM" or "HH:MM:SS" — either is accepted but trim seconds for
  // a cleaner edit experience.
  if (!raw) return "";
  const [h = "00", m = "00"] = raw.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function initialSlots(hoursByWeekday: HoursMap): Record<number, SlotState> {
  const out: Record<number, SlotState> = {};
  for (const { weekday } of DAYS) {
    const row = hoursByWeekday[weekday];
    if (row) {
      out[weekday] = {
        open: toLocal(row.open_time),
        close: toLocal(row.close_time),
        closed: false,
      };
    } else {
      out[weekday] = { open: "08:00", close: "00:00", closed: true };
    }
  }
  return out;
}

export function BranchEditForm({
  branch,
  hoursByWeekday,
}: {
  branch: Branch;
  hoursByWeekday: HoursMap;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Branch>(branch);
  const [slots, setSlots] = useState<Record<number, SlotState>>(
    initialSlots(hoursByWeekday),
  );

  function set<K extends keyof Branch>(key: K, value: Branch[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setSlot(weekday: number, patch: Partial<SlotState>) {
    setSlots((s) => ({ ...s, [weekday]: { ...s[weekday], ...patch } }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();

      // 1. Branch metadata.
      const { error: branchErr } = await supabase
        .from("branches")
        .update({
          name: form.name,
          name_en: form.name_en,
          city: form.city,
          city_en: form.city_en,
          address: form.address,
          address_en: form.address_en,
          phone: form.phone,
          maps_url: form.maps_url || null,
          active: form.active,
          sort_order: Number(form.sort_order),
        })
        .eq("id", form.id);
      if (branchErr) {
        toast.error(`تعذّر حفظ بيانات الفرع: ${branchErr.message}`);
        return;
      }

      // 2. Hours: closed weekdays get a delete, open ones an upsert. We
      // don't try to be clever here — branch_hours is at most 7 rows.
      const upserts: HourRow[] = [];
      const closedWeekdays: number[] = [];
      for (const { weekday, label } of DAYS) {
        const s = slots[weekday];
        if (s.closed) {
          closedWeekdays.push(weekday);
        } else if (!s.open || !s.close) {
          toast.error(`عبّئ ساعات ${label} أو حدّده مغلقاً.`);
          return;
        } else {
          // close at midnight (00:00) is allowed as a sentinel for "until
          // end of day". Otherwise close must be strictly after open.
          const isMidnightClose = s.close === "00:00";
          if (!isMidnightClose && s.close <= s.open) {
            toast.error(
              `${label}: وقت الإغلاق لازم بعد وقت الفتح. (أو 00:00 = منتصف الليل)`,
            );
            return;
          }
          upserts.push({
            weekday,
            open_time: s.open,
            close_time: s.close,
          });
        }
      }

      if (closedWeekdays.length) {
        const { error: delErr } = await supabase
          .from("branch_hours")
          .delete()
          .eq("branch_id", form.id)
          .in("weekday", closedWeekdays);
        if (delErr) {
          toast.error(`تعذّر تحديث الإجازات: ${delErr.message}`);
          return;
        }
      }
      if (upserts.length) {
        const { error: upErr } = await supabase
          .from("branch_hours")
          .upsert(
            upserts.map((u) => ({ ...u, branch_id: form.id })),
            { onConflict: "branch_id,weekday" },
          );
        if (upErr) {
          toast.error(`تعذّر حفظ الساعات: ${upErr.message}`);
          return;
        }
      }

      toast.success("تمّ الحفظ");
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
          <Field label="الاسم (English)" ltr value={form.name_en ?? ""} onChange={(v) => set("name_en", v)} />
          <Field label="المدينة (عربي)" value={form.city} onChange={(v) => set("city", v)} />
          <Field label="المدينة (English)" ltr value={form.city_en ?? ""} onChange={(v) => set("city_en", v)} />
          <Field
            label="العنوان (عربي)"
            value={form.address}
            onChange={(v) => set("address", v)}
            className="col-span-2"
          />
          <Field
            label="العنوان (English)"
            ltr
            value={form.address_en ?? ""}
            onChange={(v) => set("address_en", v)}
            className="col-span-2"
          />
          <Field
            label="الجوال"
            ltr
            value={form.phone ?? ""}
            onChange={(v) => set("phone", v)}
          />
          <Field
            label="رابط Google Maps"
            ltr
            value={form.maps_url ?? ""}
            onChange={(v) => set("maps_url", v)}
          />
          <Field
            label="ترتيب العرض"
            type="number"
            value={String(form.sort_order)}
            onChange={(v) => set("sort_order", Number(v))}
          />
          <div className="flex items-end gap-3">
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
                    onChange={(e) =>
                      setSlot(weekday, { close: e.target.value })
                    }
                  />
                  <input
                    type="checkbox"
                    className="size-4 mx-3"
                    checked={s.closed}
                    onChange={(e) =>
                      setSlot(weekday, { closed: e.target.checked })
                    }
                    aria-label={`${label} مغلق`}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            وقت الإغلاق 00:00 = منتصف الليل (آخر slot يبدأ الساعة 23:00).
            الفترة بين كل slot ساعة.
          </p>
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
