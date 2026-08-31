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

// Boolean toggles stored as 'true'/'false' text in app_settings.
const BOOL_FIELDS: { key: string; label: string }[] = [
  { key: "wallet_enabled", label: "تفعيل المحفظة" },
  { key: "cashback_enabled", label: "تفعيل الكاش باك" },
  { key: "cashback_on_detailing", label: "كاش باك على التلميع" },
  { key: "cashback_on_products", label: "كاش باك على المنتجات" },
  { key: "referral_enabled", label: "تفعيل نظام الدعوة" },
];

// Numeric fields stored as text. `allowEmpty` = save '' when blank (the cap).
const NUM_FIELDS: {
  key: string;
  label: string;
  hint?: string;
  allowEmpty?: boolean;
}[] = [
  { key: "cashback_percent", label: "نسبة الكاش باك %" },
  {
    key: "cashback_min_order_sar",
    label: "الحد الأدنى للطلب للكاش باك (ر.س)",
  },
  {
    key: "cashback_max_reward_sar",
    label: "حد أقصى للكاش باك للطلب (ر.س) — فارغ = بلا حد",
    allowEmpty: true,
  },
  {
    key: "wallet_max_redeem_percent",
    label: "أقصى نسبة من الطلب تُدفع من المحفظة %",
  },
  { key: "referral_referee_reward_sar", label: "مكافأة الصديق (ر.س)" },
  { key: "referral_referrer_reward_sar", label: "مكافأة الداعي (ر.س)" },
];

const ALL_KEYS = [
  ...BOOL_FIELDS.map((f) => f.key),
  ...NUM_FIELDS.map((f) => f.key),
];

export function WalletConfigForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Settings>(initial);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function isOn(key: string) {
    return form[key] === "true";
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const rows = ALL_KEYS.map((key) => {
        const boolField = BOOL_FIELDS.find((f) => f.key === key);
        if (boolField) {
          return { key, value: isOn(key) ? "true" : "false" };
        }
        const numField = NUM_FIELDS.find((f) => f.key === key)!;
        const raw = (form[key] ?? "").trim();
        // The cap saves '' when blank; other numerics keep their numeric string.
        const value = numField.allowEmpty ? raw : raw === "" ? "0" : raw;
        return { key, value };
      });
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
          <CardTitle>التفعيل</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {BOOL_FIELDS.map((f) => (
            <label
              key={f.key}
              htmlFor={f.key}
              className="flex items-center justify-between gap-4 rounded-md border p-3 cursor-pointer"
            >
              <span className="text-sm font-medium">{f.label}</span>
              <input
                id={f.key}
                type="checkbox"
                className="size-5 accent-primary cursor-pointer"
                checked={isOn(f.key)}
                onChange={(e) => set(f.key, e.target.checked ? "true" : "false")}
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>القيم</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {NUM_FIELDS.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type="number"
                step="any"
                dir="ltr"
                value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
              {f.hint && (
                <p className="text-xs text-muted-foreground">{f.hint}</p>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground sm:col-span-2">
            مكافأة الداعي تُمنح بعد أول طلب مدفوع للصديق، ومكافأة الصديق تُمنح عند
            إدخاله للكود.
          </p>
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
