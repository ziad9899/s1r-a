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

export type BannerFormValues = {
  id?: string;
  image_url: string | null;
  title_ar: string | null;
  title_en: string | null;
  target_type: "none" | "service" | "route" | "external_url";
  target_value: string | null;
  sort_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
};

type ServiceOption = { id: string; name: string };

const ROUTE_OPTIONS: { value: string; label: string }[] = [
  { value: "/services", label: "قائمة الخدمات" },
  { value: "/bookings", label: "حجوزاتي" },
  { value: "/profile", label: "الملف الشخصي" },
];

const empty: BannerFormValues = {
  image_url: null,
  title_ar: null,
  title_en: null,
  target_type: "none",
  target_value: null,
  sort_order: 0,
  is_active: true,
  start_at: null,
  end_at: null,
};

export function BannerEditForm({
  initial,
  services,
  isNew,
}: {
  initial?: BannerFormValues;
  services: ServiceOption[];
  isNew: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [form, setForm] = useState<BannerFormValues>(initial ?? empty);

  function set<K extends keyof BannerFormValues>(
    key: K,
    value: BannerFormValues[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image_url) {
      toast.error("ارفع صورة البنر أولاً.");
      return;
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const payload = {
        image_url: form.image_url,
        title_ar: form.title_ar || null,
        title_en: form.title_en || null,
        target_type: form.target_type,
        target_value:
          form.target_type === "none" ? null : form.target_value || null,
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
        start_at: form.start_at || null,
        end_at: form.end_at || null,
      };
      const { error } = isNew
        ? await supabase.from("banners").insert(payload)
        : await supabase.from("banners").update(payload).eq("id", form.id!);

      if (error) {
        toast.error(`تعذّر الحفظ: ${error.message}`);
        return;
      }
      toast.success("تمّ الحفظ");
      router.push("/dashboard/banners");
      router.refresh();
    });
  }

  function onDelete() {
    if (!form.id) return;
    if (!confirm("متأكد من حذف هذا البنر؟ لا يمكن التراجع.")) return;
    startDelete(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("banners").delete().eq("id", form.id!);
      if (error) {
        toast.error(`تعذّر الحذف: ${error.message}`);
        return;
      }
      if (form.image_url) {
        deleteImage("banner-images", form.image_url).catch(() => {});
      }
      toast.success("تمّ الحذف");
      router.push("/dashboard/banners");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>الصورة</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploader
            bucket="banner-images"
            folder="home"
            value={form.image_url}
            onChange={(url) => set("image_url", url)}
            aspect="16/9"
            recommendedSize="1600×735"
            recommendedRatio="12:5"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المحتوى</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="العنوان (عربي — اختياري)"
              value={form.title_ar ?? ""}
              onChange={(v) => set("title_ar", v)}
            />
            <Field
              label="العنوان (English — اختياري)"
              ltr
              value={form.title_en ?? ""}
              onChange={(v) => set("title_en", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الهدف عند الضغط</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>نوع الهدف</Label>
            <select
              value={form.target_type}
              onChange={(e) => {
                const v = e.target.value as BannerFormValues["target_type"];
                set("target_type", v);
                set("target_value", null);
              }}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="none">بدون — مجرد عرض</option>
              <option value="service">فتح خدمة</option>
              <option value="route">فتح صفحة داخلية</option>
              <option value="external_url">فتح رابط خارجي</option>
            </select>
          </div>

          {form.target_type === "service" && (
            <div className="grid gap-1.5">
              <Label>الخدمة</Label>
              <select
                value={form.target_value ?? ""}
                onChange={(e) => set("target_value", e.target.value || null)}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— اختر —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.target_type === "route" && (
            <div className="grid gap-1.5">
              <Label>الصفحة</Label>
              <select
                value={form.target_value ?? ""}
                onChange={(e) => set("target_value", e.target.value || null)}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— اختر —</option>
                {ROUTE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.target_type === "external_url" && (
            <Field
              label="الرابط الخارجي"
              ltr
              value={form.target_value ?? ""}
              onChange={(v) => set("target_value", v)}
              placeholder="https://example.com"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الجدولة والترتيب</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="من تاريخ (اختياري)"
              type="datetime-local"
              ltr
              value={toLocalInput(form.start_at)}
              onChange={(v) => set("start_at", fromLocalInput(v))}
            />
            <Field
              label="حتى تاريخ (اختياري)"
              type="datetime-local"
              ltr
              value={toLocalInput(form.end_at)}
              onChange={(v) => set("end_at", fromLocalInput(v))}
            />
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

// `<input type="datetime-local">` wants `YYYY-MM-DDTHH:mm` with no timezone.
// Convert to/from the ISO string we store in Supabase.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
