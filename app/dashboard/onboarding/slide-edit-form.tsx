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

export type SlideFormValues = {
  id?: string;
  image_url: string | null;
  title_ar: string;
  title_en: string | null;
  body_ar: string;
  body_en: string | null;
  sort_order: number;
  is_active: boolean;
};

const empty: SlideFormValues = {
  image_url: null,
  title_ar: "",
  title_en: null,
  body_ar: "",
  body_en: null,
  sort_order: 0,
  is_active: true,
};

export function SlideEditForm({
  initial,
  isNew,
}: {
  initial?: SlideFormValues;
  isNew: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [form, setForm] = useState<SlideFormValues>(initial ?? empty);

  function set<K extends keyof SlideFormValues>(
    key: K,
    value: SlideFormValues[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image_url) {
      toast.error("ارفع صورة الشاشة أولاً.");
      return;
    }
    if (!form.title_ar.trim() || !form.body_ar.trim()) {
      toast.error("العنوان والشرح بالعربية مطلوبان.");
      return;
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const payload = {
        image_url: form.image_url,
        title_ar: form.title_ar.trim(),
        title_en: form.title_en?.trim() || null,
        body_ar: form.body_ar.trim(),
        body_en: form.body_en?.trim() || null,
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
      };
      const { error } = isNew
        ? await supabase.from("onboarding_slides").insert(payload)
        : await supabase
            .from("onboarding_slides")
            .update(payload)
            .eq("id", form.id!);

      if (error) {
        toast.error(`تعذّر الحفظ: ${error.message}`);
        return;
      }
      toast.success("تمّ الحفظ");
      router.push("/dashboard/onboarding");
      router.refresh();
    });
  }

  function onDelete() {
    if (!form.id) return;
    if (!confirm("متأكد من حذف هذه الشاشة؟ لا يمكن التراجع.")) return;
    startDelete(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("onboarding_slides")
        .delete()
        .eq("id", form.id!);
      if (error) {
        toast.error(`تعذّر الحذف: ${error.message}`);
        return;
      }
      if (form.image_url) {
        deleteImage("onboarding-images", form.image_url).catch(() => {});
      }
      toast.success("تمّ الحذف");
      router.push("/dashboard/onboarding");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>صورة الخلفية</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploader
              bucket="onboarding-images"
              folder="slides"
              value={form.image_url}
              onChange={(url) => set("image_url", url)}
              aspect="3/4"
              recommendedSize="1080×1920"
              recommendedRatio="9:16"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              الصورة تملأ كامل الشاشة. يُضاف overlay داكن تلقائياً ليكون
              النص واضحاً.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>النصوص</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="العنوان (عربي) *"
                value={form.title_ar}
                onChange={(v) => set("title_ar", v)}
              />
              <Field
                label="العنوان (English)"
                ltr
                value={form.title_en ?? ""}
                onChange={(v) => set("title_en", v)}
              />
            </div>
            <TextArea
              label="الشرح (عربي) *"
              value={form.body_ar}
              onChange={(v) => set("body_ar", v)}
              rows={3}
            />
            <TextArea
              label="الشرح (English)"
              ltr
              value={form.body_en ?? ""}
              onChange={(v) => set("body_en", v)}
              rows={3}
            />
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
                  نشطة (تظهر للمستخدمين)
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
      </div>

      <PhonePreview slide={form} />
    </form>
  );
}

function PhonePreview({ slide }: { slide: SlideFormValues }) {
  return (
    <div className="lg:sticky lg:top-6 lg:self-start">
      <div className="text-xs font-medium mb-2 text-muted-foreground">
        معاينة على شاشة جوّال
      </div>
      <div
        className="relative mx-auto overflow-hidden rounded-[28px] border-4 border-foreground/80 bg-black shadow-xl"
        style={{ width: 240, aspectRatio: "9 / 16" }}
      >
        {slide.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.image_url}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-muted text-xs text-muted-foreground">
            ارفع صورة لرؤية المعاينة
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/85" />
        <div className="absolute inset-x-0 top-0 flex justify-end p-3 text-[10px] text-white/80">
          تخطي
        </div>
        <div className="absolute inset-x-3 bottom-4 text-white" dir="rtl">
          <div className="text-sm font-bold mb-1">
            {slide.title_ar || "العنوان"}
          </div>
          <div className="text-[10px] opacity-80 leading-snug line-clamp-3">
            {slide.body_ar || "الشرح القصير للشاشة..."}
          </div>
          <div className="mt-3 h-7 rounded-md bg-white/95 grid place-items-center text-[10px] font-bold text-black">
            التالي
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  ltr?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
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
