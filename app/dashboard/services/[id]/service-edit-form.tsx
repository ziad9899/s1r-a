"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { deleteImage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "@/components/image-uploader";
import { GalleryUploader } from "./gallery-uploader";

type Service = {
  id: string;
  name: string;
  name_en: string | null;
  short_name: string | null;
  short_name_en: string | null;
  tagline: string | null;
  tagline_en: string | null;
  description: string | null;
  description_en: string | null;
  starting_price_sar: number;
  duration_label: string | null;
  duration_label_en: string | null;
  tag: string | null;
  tag_en: string | null;
  warranty: string | null;
  warranty_en: string | null;
  hero_image_url: string | null;
  hero_alt_ar: string | null;
  hero_alt_en: string | null;
  active: boolean;
  sort_order: number;
};

export function ServiceEditForm({ service }: { service: Service }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [form, setForm] = useState<Service>(service);

  function set<K extends keyof Service>(key: K, value: Service[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onDelete() {
    if (
      !confirm(
        `متأكد من حذف خدمة "${form.name}"؟ سيُحذف معها كل ربط بها (الفلاتر، صور المعرض). الحجوزات السابقة لا تُحذف.`,
      )
    ) {
      return;
    }
    startDelete(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", form.id);
      if (error) {
        toast.error(`تعذّر الحذف: ${error.message}`);
        return;
      }
      if (form.hero_image_url) {
        deleteImage("service-images", form.hero_image_url).catch(() => {});
      }
      toast.success("تمّ الحذف");
      router.push("/dashboard/services");
      router.refresh();
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("services")
        .update({
          name: form.name,
          name_en: form.name_en,
          short_name: form.short_name,
          short_name_en: form.short_name_en,
          tagline: form.tagline,
          tagline_en: form.tagline_en,
          description: form.description,
          description_en: form.description_en,
          starting_price_sar: Number(form.starting_price_sar),
          duration_label: form.duration_label,
          duration_label_en: form.duration_label_en,
          tag: form.tag || null,
          tag_en: form.tag_en || null,
          warranty: form.warranty,
          warranty_en: form.warranty_en,
          hero_image_url: form.hero_image_url,
          hero_alt_ar: form.hero_alt_ar,
          hero_alt_en: form.hero_alt_en,
          active: form.active,
          sort_order: Number(form.sort_order),
        })
        .eq("id", form.id);

      if (error) {
        toast.error(`تعذّر الحفظ: ${error.message}`);
        return;
      }
      toast.success("تمّ الحفظ");
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
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="الاسم (عربي)"
              value={form.name}
              onChange={(v) => set("name", v)}
            />
            <Field
              label="الاسم (English)"
              ltr
              value={form.name_en ?? ""}
              onChange={(v) => set("name_en", v)}
            />
            <Field
              label="الاسم المختصر (عربي)"
              value={form.short_name ?? ""}
              onChange={(v) => set("short_name", v)}
            />
            <Field
              label="الاسم المختصر (English)"
              ltr
              value={form.short_name_en ?? ""}
              onChange={(v) => set("short_name_en", v)}
            />
            <Field
              label="السعر الأساسي (ر.س)"
              type="number"
              value={String(form.starting_price_sar)}
              onChange={(v) => set("starting_price_sar", Number(v))}
            />
            <Field
              label="المدّة (عربي)"
              value={form.duration_label ?? ""}
              onChange={(v) => set("duration_label", v)}
            />
            <Field
              label="المدّة (English)"
              ltr
              value={form.duration_label_en ?? ""}
              onChange={(v) => set("duration_label_en", v)}
            />
            <Field
              label="الوسم (عربي — اختياري)"
              value={form.tag ?? ""}
              onChange={(v) => set("tag", v)}
            />
            <Field
              label="الوسم (English — اختياري)"
              ltr
              value={form.tag_en ?? ""}
              onChange={(v) => set("tag_en", v)}
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
                مفعّلة (تظهر للعملاء)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>صورة الـ Hero</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ImageUploader
            bucket="service-images"
            folder={form.id}
            value={form.hero_image_url}
            onChange={(url) => set("hero_image_url", url)}
            aspect="16/9"
            recommendedSize="1920×1080"
            recommendedRatio="16:9"
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="نص بديل (عربي)"
              value={form.hero_alt_ar ?? ""}
              onChange={(v) => set("hero_alt_ar", v)}
            />
            <Field
              label="نص بديل (English)"
              ltr
              value={form.hero_alt_en ?? ""}
              onChange={(v) => set("hero_alt_en", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معرض الصور</CardTitle>
          <p className="text-xs text-muted-foreground">
            صور إضافية تظهر في شريط تنقّل أعلى صفحة الخدمة (بعد صورة الـ Hero).
            يضغط العميل على الصورة لفتحها بحجم كامل.
          </p>
        </CardHeader>
        <CardContent>
          <GalleryUploader serviceId={form.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الوصف</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <TextArea
            label="عنوان قصير (عربي)"
            value={form.tagline ?? ""}
            onChange={(v) => set("tagline", v)}
          />
          <TextArea
            label="عنوان قصير (English)"
            ltr
            value={form.tagline_en ?? ""}
            onChange={(v) => set("tagline_en", v)}
          />
          <TextArea
            label="الوصف الكامل (عربي)"
            rows={5}
            value={form.description ?? ""}
            onChange={(v) => set("description", v)}
          />
          <TextArea
            label="الوصف الكامل (English)"
            ltr
            rows={5}
            value={form.description_en ?? ""}
            onChange={(v) => set("description_en", v)}
          />
          <TextArea
            label="الضمان (عربي)"
            value={form.warranty ?? ""}
            onChange={(v) => set("warranty", v)}
          />
          <TextArea
            label="الضمان (English)"
            ltr
            value={form.warranty_en ?? ""}
            onChange={(v) => set("warranty_en", v)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={deleting || pending}
          onClick={onDelete}
        >
          {deleting && <Loader2 className="size-4 animate-spin" />}
          <Trash2 className="size-4" />
          حذف الخدمة
        </Button>
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
  step,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  ltr?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        step={step}
        dir={ltr ? "ltr" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 2,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  ltr?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <textarea
        rows={rows}
        dir={ltr ? "ltr" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-background flex w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
