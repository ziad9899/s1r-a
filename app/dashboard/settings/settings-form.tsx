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
}[] = [
  { key: "app_name", label: "اسم التطبيق" },
  { key: "app_tagline", label: "العبارة التعريفية" },
  { key: "support_email", label: "بريد الدعم", ltr: true },
  { key: "support_phone", label: "جوال الدعم (E.164)", ltr: true, hint: "مثال: +966500000000" },
  { key: "support_phone_display", label: "جوال الدعم (للعرض)", ltr: true },
  { key: "support_hours", label: "ساعات العمل" },
  { key: "support_address", label: "العنوان" },
  { key: "privacy_effective_date", label: "تاريخ بدء سياسة الخصوصية", ltr: true, hint: "صيغة YYYY-MM-DD" },
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Settings>(initial);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const rows = FIELDS.map((f) => ({ key: f.key, value: form[f.key] ?? "" }));
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
          <CardTitle>البيانات العامة</CardTitle>
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
