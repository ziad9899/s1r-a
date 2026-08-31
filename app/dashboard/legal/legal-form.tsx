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

type Field = {
  key: string;
  label: string;
  ltr?: boolean;
  textarea?: boolean;
  big?: boolean;
  hint?: string;
  required?: boolean;
};

const BODY_HINT =
  "اتركه فارغاً لعرض النص الافتراضي داخل التطبيق. ابدأ أي قسم بسطر يبدأ بـ «## » (مثال: ## المقدّمة)، وافصل الفقرات بسطر فارغ.";

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "الرقم الضريبي",
    fields: [
      {
        key: "vat_number",
        label: "الرقم الضريبي (ZATCA)",
        ltr: true,
        required: true,
        hint: "رقم التسجيل الضريبي — يظهر في صفحة الحساب وفي الفواتير داخل التطبيق.",
      },
    ],
  },
  {
    title: "سياسة الخصوصية",
    fields: [
      {
        key: "privacy_effective_date",
        label: "تاريخ السريان",
        ltr: true,
        hint: "بصيغة YYYY-MM-DD، مثال: 2026-05-08",
      },
      {
        key: "privacy_body_ar",
        label: "النص الكامل (عربي)",
        textarea: true,
        big: true,
        hint: BODY_HINT,
      },
      {
        key: "privacy_body_en",
        label: "النص الكامل (إنجليزي)",
        ltr: true,
        textarea: true,
        big: true,
        hint: "Leave empty to show the built-in default. Start a section with a line beginning with \"## \".",
      },
    ],
  },
  {
    title: "الشروط والأحكام",
    fields: [
      {
        key: "terms_body_ar",
        label: "النص الكامل (عربي)",
        textarea: true,
        big: true,
        hint: BODY_HINT,
      },
      {
        key: "terms_body_en",
        label: "النص الكامل (إنجليزي)",
        ltr: true,
        textarea: true,
        big: true,
        hint: "Leave empty to show the built-in default. Start a section with a line beginning with \"## \".",
      },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);

export function LegalForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Settings>(initial);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Required fields (e.g. the VAT number) must never be blanked; the legal
    // bodies stay optional (empty = show the app's built-in default text).
    const missing = ALL_FIELDS.filter(
      (f) => f.required && !(form[f.key] ?? "").trim(),
    );
    if (missing.length > 0) {
      toast.error(`الحقول التالية مطلوبة: ${missing.map((f) => f.label).join("، ")}`);
      return;
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const rows = ALL_FIELDS.map((f) => ({
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
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {section.fields.map((f) => (
              <div key={f.key} className="grid gap-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                {f.textarea ? (
                  <Textarea
                    id={f.key}
                    dir={f.ltr ? "ltr" : undefined}
                    className={f.big ? "min-h-[240px]" : undefined}
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
      ))}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          حفظ التغييرات
        </Button>
      </div>
    </form>
  );
}
