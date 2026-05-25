"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, Copy, Ticket } from "lucide-react";

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
  promo_code: string | null;
  promo_discount_percent: number | null;
  promo_active: boolean;
  category_id: string | null;
  price_size_small: number | null;
  price_size_medium: number | null;
  price_size_large: number | null;
  package_items_ar: string[] | null;
  package_items_en: string[] | null;
};

type CategoryOption = { id: string; label_ar: string };

export function ServiceEditForm({
  service,
  categories,
}: {
  service: Service;
  categories: CategoryOption[];
}) {
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
        `متأكد من حذف خدمة "${form.name}"؟ سيُحذف معها كل ربط بها (صور المعرض). الحجوزات السابقة لا تُحذف.`,
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
    // Sizes are validated together: either all three filled, or none.
    // Partial config would yield an inconsistent quote because the booking
    // flow falls back to starting_price × multiplier only when *all* sizes
    // are null.
    const anySize =
      form.price_size_small != null ||
      form.price_size_medium != null ||
      form.price_size_large != null;
    const allSizes =
      form.price_size_small != null &&
      form.price_size_medium != null &&
      form.price_size_large != null;
    if (anySize && !allSizes) {
      toast.error("لو تبي تستخدم أسعار الحجم، عبّ الثلاث أحجام (صغير + وسط + كبير).");
      return;
    }
    if (form.promo_active) {
      const code = form.promo_code?.trim() ?? "";
      const pct = Number(form.promo_discount_percent ?? 0);
      if (!code) {
        toast.error("اكتب رمز الخصم أو ألغ التفعيل.");
        return;
      }
      if (!Number.isFinite(pct) || pct < 1 || pct > 99) {
        toast.error("نسبة الخصم لازم تكون بين 1 و 99.");
        return;
      }
    }
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
          promo_code: form.promo_active
            ? (form.promo_code?.trim().toUpperCase() || null)
            : null,
          promo_discount_percent: form.promo_active
            ? Number(form.promo_discount_percent ?? 0)
            : null,
          promo_active: form.promo_active,
          category_id: form.category_id || null,
          price_size_small: form.price_size_small,
          price_size_medium: form.price_size_medium,
          price_size_large: form.price_size_large,
          package_items_ar: (form.package_items_ar ?? []).filter(
            (s) => s.trim() !== "",
          ),
          package_items_en: (form.package_items_en ?? []).filter(
            (s) => s.trim() !== "",
          ),
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
          <div className="grid gap-1.5">
            <Label>الفئة</Label>
            <select
              value={form.category_id ?? ""}
              onChange={(e) => set("category_id", e.target.value || null)}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— بدون فئة (تظهر فقط تحت &quot;الكل&quot;) —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label_ar}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              الفئة هي زرّ في شريط الفلاتر فوق الشبكة. الخدمات المرتبطة بنفس
              الفئة تظهر تحت ضغطة الزر. أنشئ فئات جديدة من{" "}
              <span className="font-medium">الفئات</span>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>أسعار حسب حجم السيارة (اختياري)</CardTitle>
          <p className="text-xs text-muted-foreground">
            لو عبّيت الثلاث أسعار، السعر النهائي في الحجز يجي مباشرة من هنا حسب
            حجم سيارة العميل. لو خلّيتها فاضية، يُحسب السعر من السعر الأساسي
            × معامل نوع السيارة (سيدان=1، SUV=1.25، لاكجري=1.5).
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            <SizePriceField
              label="سعر السيارة الصغيرة"
              value={form.price_size_small}
              onChange={(v) => set("price_size_small", v)}
            />
            <SizePriceField
              label="سعر السيارة الوسط"
              value={form.price_size_medium}
              onChange={(v) => set("price_size_medium", v)}
            />
            <SizePriceField
              label="سعر السيارة الكبيرة"
              value={form.price_size_large}
              onChange={(v) => set("price_size_large", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ما تشمله الخدمة (اختياري)</CardTitle>
          <p className="text-xs text-muted-foreground">
            نقاط قصيرة تظهر في صفحة الخدمة. كل سطر = نقطة.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <IncludedItemsField
            label="عربي"
            items={form.package_items_ar ?? []}
            onChange={(items) => set("package_items_ar", items)}
          />
          <IncludedItemsField
            label="English"
            items={form.package_items_en ?? []}
            onChange={(items) => set("package_items_en", items)}
            ltr
          />
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
          <CardTitle className="flex items-center gap-2">
            <Ticket className="size-5" />
            خصم خاص بهذه الخدمة
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            عند التفعيل، يقدر العميل يدخل الرمز في صفحة الحجز ويحصل على الخصم.
            يمكن نفس الرمز يكون على عدة خدمات (مثلاً EID2026).
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <input
              id="promo_active"
              type="checkbox"
              className="size-4"
              checked={form.promo_active}
              onChange={(e) => set("promo_active", e.target.checked)}
            />
            <Label htmlFor="promo_active" className="cursor-pointer">
              تفعيل الخصم
            </Label>
          </div>
          {form.promo_active && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>رمز الخصم</Label>
                <div className="flex gap-2">
                  <Input
                    dir="ltr"
                    value={form.promo_code ?? ""}
                    onChange={(e) =>
                      set("promo_code", e.target.value.toUpperCase())
                    }
                    placeholder="EID2026"
                    maxLength={32}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!form.promo_code?.trim()}
                    onClick={() => {
                      navigator.clipboard.writeText(form.promo_code ?? "");
                      toast.success("تم نسخ الرمز");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  أحرف وأرقام فقط. الأقصر = أسهل للمشاركة.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label>نسبة الخصم (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  dir="ltr"
                  value={form.promo_discount_percent ?? ""}
                  onChange={(e) =>
                    set(
                      "promo_discount_percent",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  من 1 إلى 99. (100 = مجاناً، غير مدعوم.)
                </p>
              </div>
            </div>
          )}
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

function SizePriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label} (ر.س)</Label>
      <Input
        type="number"
        min={0}
        step="any"
        dir="ltr"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </div>
  );
}

function IncludedItemsField({
  label,
  items,
  onChange,
  ltr,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  ltr?: boolean;
}) {
  const text = items.join("\n");
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <textarea
        rows={5}
        dir={ltr ? "ltr" : undefined}
        value={text}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        placeholder={ltr ? "Free polishing\nWheel coating" : "تلميع مجاني\nنانو للجنوط"}
        className="border-input bg-background flex w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
