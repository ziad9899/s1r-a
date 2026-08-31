"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Settings = Record<string, string>;

const FIELDS: {
  key: string;
  label: string;
  ltr?: boolean;
  textarea?: boolean;
  hint?: string;
}[] = [
  { key: "referral_heading_ar", label: "العنوان (عربي)" },
  { key: "referral_body_ar", label: "الوصف (عربي)", textarea: true },
  {
    key: "referral_share_ar",
    label: "نص الدعوة للمشاركة (عربي)",
    textarea: true,
    hint: "استخدم {code} لإدراج كود العميل تلقائياً",
  },
  { key: "referral_heading_en", label: "العنوان (إنجليزي)", ltr: true },
  {
    key: "referral_body_en",
    label: "الوصف (إنجليزي)",
    ltr: true,
    textarea: true,
  },
  {
    key: "referral_share_en",
    label: "نص الدعوة للمشاركة (إنجليزي)",
    ltr: true,
    textarea: true,
    hint: "Use {code} to insert the customer code",
  },
];

export function ReferralForm({ initial }: { initial: Settings }) {
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
          <CardTitle>نصوص صفحة الدعوة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              {f.textarea ? (
                <Textarea
                  id={f.key}
                  dir={f.ltr ? "ltr" : undefined}
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : (
                <Input
                  id={f.key}
                  dir={f.ltr ? "ltr" : undefined}
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
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
