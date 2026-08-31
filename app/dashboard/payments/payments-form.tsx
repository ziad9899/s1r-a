"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { savePaymentConfig } from "./actions";

// Credential fields grouped by provider. `name` MUST match the Edge Function
// env-var / Vault key name. Fields are WRITE-ONLY — blank means "leave the
// current value unchanged"; the current value is never shown, only a mask.
const PROVIDERS: {
  title: string;
  fields: { name: string; label: string }[];
}[] = [
  {
    title: "ميسر (البطاقة · Apple Pay · STC)",
    fields: [
      { name: "MOYASAR_SECRET_KEY", label: "المفتاح السري (sk_live)" },
      { name: "MOYASAR_WEBHOOK_SECRET", label: "سر الـWebhook" },
    ],
  },
  {
    title: "تابي (تقسيط)",
    fields: [
      { name: "TABBY_SECRET_KEY", label: "المفتاح السري (sk_live)" },
      { name: "TABBY_MERCHANT_CODE", label: "رمز التاجر" },
      { name: "TABBY_WEBHOOK_SECRET", label: "سر الـWebhook" },
    ],
  },
  {
    title: "مدفوع (تقسيط)",
    fields: [
      { name: "MADFU_AUTH", label: "Authorization (Basic)" },
      { name: "MADFU_APP_CODE", label: "App Code" },
      { name: "MADFU_API_KEY", label: "API Key" },
      { name: "MADFU_WEBHOOK_SECRET", label: "سر الـWebhook" },
    ],
  },
];

export function PaymentsForm({
  tabbyEnabled: initTabby,
  madfuEnabled: initMadfu,
  masks,
}: {
  tabbyEnabled: boolean;
  madfuEnabled: boolean;
  masks: Record<string, string | null>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tabby, setTabby] = useState(initTabby);
  const [madfu, setMadfu] = useState(initMadfu);
  const [secrets, setSecrets] = useState<Record<string, string>>({});

  function setSecret(name: string, value: string) {
    setSecrets((s) => ({ ...s, [name]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await savePaymentConfig({
        tabbyEnabled: tabby,
        madfuEnabled: madfu,
        secrets,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("تمّ الحفظ — يسري خلال دقيقة بلا تحديث للتطبيق");
      setSecrets({});
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">طرق الدفع</h1>
        <p className="text-sm text-muted-foreground">
          تحكّم في إظهار موفّري التقسيط ومفاتيح الـAPI مباشرةً — التغيير يسري
          خلال دقيقة بلا إعادة رفع للتطبيق.
        </p>
      </div>

      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        ⚠️ لا تُفعّل موفّراً قبل إدخال مفاتيح الإنتاج الصحيحة له. لو فُعّل بلا
        مفاتيح صالحة، يرجع العميل تلقائيّاً للدفع بالبطاقة (لا ينكسر الطلب).
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>إظهار الموفّرين في التطبيق</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <label
              htmlFor="tabby_enabled"
              className="flex items-center justify-between gap-4 rounded-md border p-3 cursor-pointer"
            >
              <span className="text-sm font-medium">تابي (تقسيط)</span>
              <input
                id="tabby_enabled"
                type="checkbox"
                className="size-5 accent-primary cursor-pointer"
                checked={tabby}
                onChange={(e) => setTabby(e.target.checked)}
              />
            </label>
            <label
              htmlFor="madfu_enabled"
              className="flex items-center justify-between gap-4 rounded-md border p-3 cursor-pointer"
            >
              <span className="text-sm font-medium">مدفوع (تقسيط)</span>
              <input
                id="madfu_enabled"
                type="checkbox"
                className="size-5 accent-primary cursor-pointer"
                checked={madfu}
                onChange={(e) => setMadfu(e.target.checked)}
              />
            </label>
          </CardContent>
        </Card>

        {PROVIDERS.map((p) => (
          <Card key={p.title}>
            <CardHeader>
              <CardTitle className="text-base">{p.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {p.fields.map((f) => (
                <div key={f.name} className="grid gap-1.5">
                  <Label htmlFor={f.name}>{f.label}</Label>
                  <Input
                    id={f.name}
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    placeholder={masks[f.name] ?? "غير محدّد"}
                    value={secrets[f.name] ?? ""}
                    onChange={(e) => setSecret(f.name, e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {masks[f.name]
                      ? `مضبوط حاليّاً (${masks[f.name]}) — اتركه فارغاً للإبقاء عليه`
                      : "غير مضبوط من اللوحة — اتركه فارغاً لاستخدام قيمة الخادم"}
                  </p>
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
    </div>
  );
}
