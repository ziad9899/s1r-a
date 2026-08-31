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

type Settings = Record<string, string>;

const FIELDS: {
  key: string;
  label: string;
  ltr?: boolean;
  hint?: string;
  required?: boolean;
}[] = [
  { key: "app_name", label: "اسم التطبيق", required: true },
  { key: "app_tagline", label: "الوصف المختصر" },
  {
    key: "support_phone",
    label: "رقم الجوال (للاتصال وواتساب)",
    ltr: true,
    required: true,
    hint: "بصيغة E.164، مثال: +966551307411 — يُستخدم لروابط الاتصال وواتساب",
  },
  {
    key: "support_phone_display",
    label: "رقم الجوال (كما يظهر للعميل)",
    ltr: true,
    required: true,
    hint: "الصيغة المعروضة على الشاشة، مثال: +966 55 130 7411",
  },
  { key: "support_email", label: "البريد الإلكتروني", ltr: true, required: true },
  {
    key: "support_hours",
    label: "ساعات العمل",
    hint: "مثال: يومياً 9 صباحاً — 10 مساءً",
  },
  { key: "support_address", label: "العنوان" },
];

export function SupportForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Settings>(initial);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The app reads these live and an empty string is NOT treated as "use
    // default" — a blank phone/email breaks the tel:/wa.me/mailto links. Block
    // a save that would clear a required field.
    const missing = FIELDS.filter(
      (f) => f.required && !(form[f.key] ?? "").trim(),
    );
    if (missing.length > 0) {
      toast.error(`الحقول التالية مطلوبة: ${missing.map((f) => f.label).join("، ")}`);
      return;
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const rows = FIELDS.map((f) => ({
        key: f.key,
        value: (form[f.key] ?? "").trim(),
      }));
      const { error } = await supabase.from("app_settings").upsert(rows);
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
          <CardTitle>بيانات التواصل</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                dir={f.ltr ? "ltr" : undefined}
                value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
              {f.hint && (
                <p className="text-xs text-muted-foreground">{f.hint}</p>
              )}
            </div>
          ))}
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
