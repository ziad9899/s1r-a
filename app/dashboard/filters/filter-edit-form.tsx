"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type FilterFormValues = {
  id?: string;
  label_ar: string;
  label_en: string | null;
  sort_order: number;
  is_active: boolean;
};

const empty: FilterFormValues = {
  label_ar: "",
  label_en: null,
  sort_order: 0,
  is_active: true,
};

export function FilterEditForm({
  initial,
  isNew,
}: {
  initial?: FilterFormValues;
  isNew: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [form, setForm] = useState<FilterFormValues>(initial ?? empty);

  function set<K extends keyof FilterFormValues>(
    key: K,
    value: FilterFormValues[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label_ar.trim()) {
      toast.error("المسمّى بالعربية مطلوب.");
      return;
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const payload = {
        label_ar: form.label_ar.trim(),
        label_en: form.label_en?.trim() || null,
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
      };
      const { error } = isNew
        ? await supabase.from("service_filters").insert(payload)
        : await supabase
            .from("service_filters")
            .update(payload)
            .eq("id", form.id!);

      if (error) {
        toast.error(`تعذّر الحفظ: ${error.message}`);
        return;
      }
      toast.success("تمّ الحفظ");
      router.push("/dashboard/filters");
      router.refresh();
    });
  }

  function onDelete() {
    if (!form.id) return;
    if (
      !confirm(
        "متأكد من حذف هذه الفئة؟ الخدمات المرتبطة بها ستعود إلى \"بدون فئة\".",
      )
    )
      return;
    startDelete(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("service_filters")
        .delete()
        .eq("id", form.id!);
      if (error) {
        toast.error(`تعذّر الحذف: ${error.message}`);
        return;
      }
      toast.success("تمّ الحذف");
      router.push("/dashboard/filters");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>المحتوى</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="المسمّى (عربي) *"
              value={form.label_ar}
              onChange={(v) => set("label_ar", v)}
              placeholder="مثال: عازل حراري"
            />
            <Field
              label="المسمّى (English)"
              ltr
              value={form.label_en ?? ""}
              onChange={(v) => set("label_en", v)}
              placeholder="e.g. Thermal"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            تظهر الفئة كزرّ فوق شبكة الخدمات. ربط الخدمات بهذه الفئة يتمّ من
            صفحة كل خدمة عبر حقل &quot;الفئة&quot;.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الترتيب والحالة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="ترتيب العرض"
              type="number"
              value={String(form.sort_order)}
              onChange={(v) => set("sort_order", Number(v))}
            />
            <div className="flex items-end gap-3">
              <input
                id="is_active"
                type="checkbox"
                className="size-4"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                نشط (يظهر في التطبيق)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        {!isNew ? (
          <Button
            type="button"
            variant="outline"
            disabled={deleting || pending}
            onClick={onDelete}
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            <Trash2 className="size-4" />
            حذف
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {isNew ? "إنشاء" : "حفظ التغييرات"}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  ltr?: boolean;
  placeholder?: string;
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
    </div>
  );
}
