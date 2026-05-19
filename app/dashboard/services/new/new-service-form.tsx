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

type Form = {
  id: string;
  name: string;
  name_en: string;
  starting_price_sar: number;
  icon_key: string;
  duration_label: string;
  sort_order: number;
  active: boolean;
  category_id: string | null;
};

type CategoryOption = { id: string; label_ar: string };

const ICON_OPTIONS = [
  { value: "shield", label: "درع (افتراضي)" },
  { value: "sparkles", label: "نجوم لامعة" },
  { value: "layers", label: "طبقات" },
  { value: "wand", label: "عصا تلميع" },
  { value: "sun", label: "شمس / عزل حراري" },
];

const empty: Form = {
  id: "",
  name: "",
  name_en: "",
  starting_price_sar: 0,
  icon_key: "shield",
  duration_label: "",
  sort_order: 99,
  active: true,
  category_id: null,
};

// The services table uses a TEXT primary key (e.g. 'ppf', 'nano'). The
// chips and home grid filter by this id, so let the admin set it
// explicitly — but enforce a slug shape so customer-facing links stay
// clean.
function sanitiseId(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function NewServiceForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Form>(empty);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = sanitiseId(form.id);
    if (!id) {
      toast.error("المعرّف مطلوب (أحرف لاتينية وأرقام فقط).");
      return;
    }
    if (!form.name.trim()) {
      toast.error("الاسم بالعربية مطلوب.");
      return;
    }
    if (!form.starting_price_sar || form.starting_price_sar <= 0) {
      toast.error("السعر الأساسي يجب أن يكون أكبر من صفر.");
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("services").insert({
        id,
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        starting_price_sar: Number(form.starting_price_sar),
        icon_key: form.icon_key || "shield",
        duration_label: form.duration_label.trim() || null,
        sort_order: Number(form.sort_order),
        active: form.active,
        category_id: form.category_id,
      });

      if (error) {
        const msg = error.code === "23505"
          ? `المعرّف "${id}" مستخدم سابقاً — اختر معرّفاً مختلفاً.`
          : `تعذّر الإنشاء: ${error.message}`;
        toast.error(msg);
        return;
      }

      toast.success("تمّ إنشاء الخدمة");
      router.push(`/dashboard/services/${id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>الأساسيات</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="المعرّف *"
            ltr
            value={form.id}
            onChange={(v) => set("id", v)}
            placeholder="carwash, detailing, ..."
            description="حروف لاتينية صغيرة وأرقام فقط. يُستخدم في الـ URL والفلاتر — لا يُعرض للعميل مباشرة."
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="الاسم (عربي) *"
              value={form.name}
              onChange={(v) => set("name", v)}
              placeholder="مثال: غسيل خارجي"
            />
            <Field
              label="الاسم (English)"
              ltr
              value={form.name_en}
              onChange={(v) => set("name_en", v)}
              placeholder="e.g. Exterior wash"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="السعر الأساسي (ر.س) *"
              type="number"
              value={String(form.starting_price_sar || "")}
              onChange={(v) => set("starting_price_sar", Number(v))}
              placeholder="مثال: 200"
            />
            <Field
              label="المدّة (مثال: ساعتان)"
              value={form.duration_label}
              onChange={(v) => set("duration_label", v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>الأيقونة الافتراضية</Label>
              <select
                value={form.icon_key}
                onChange={(e) => set("icon_key", e.target.value)}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                تظهر عندما لا توجد صورة hero مرفوعة.
              </p>
            </div>
            <Field
              label="ترتيب العرض"
              type="number"
              value={String(form.sort_order)}
              onChange={(v) => set("sort_order", Number(v))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>الفئة</Label>
            <select
              value={form.category_id ?? ""}
              onChange={(e) => set("category_id", e.target.value || null)}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— بدون فئة —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label_ar}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              تظهر الخدمة عند الضغط على هذه الفئة في شريط الفلاتر. يمكن تغييرها
              لاحقاً من صفحة التعديل.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="active"
              type="checkbox"
              className="size-4"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
            />
            <Label htmlFor="active" className="cursor-pointer">
              مفعّلة (تظهر للعملاء فوراً بعد الإنشاء)
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          إنشاء الخدمة
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
  placeholder,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  ltr?: boolean;
  placeholder?: string;
  description?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        dir={ltr ? "ltr" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
