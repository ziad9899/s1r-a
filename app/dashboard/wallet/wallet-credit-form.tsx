"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { creditWallet } from "./actions";

// Manual compensation credit (or a negative correction) into a customer's
// wallet. Resolves the customer by their app phone. super_admin-gated server-side.
export function WalletCreditForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phoneLocal, setPhoneLocal] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!/^5\d{8}$/.test(phoneLocal)) {
      toast.error("رقم جوال العميل غير صالح. أدخل 9 خانات تبدأ بـ 5.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt === 0) {
      toast.error("أدخل مبلغاً غير صفري (يمكن أن يكون سالباً للتصحيح).");
      return;
    }
    startTransition(async () => {
      const res = await creditWallet({
        phoneE164: `+966${phoneLocal}`,
        amount: amt,
        reason,
      });
      if (res.ok) {
        toast.success(`تمّ. الرصيد الجديد: ${res.balance} ر.س`);
        setPhoneLocal("");
        setAmount("");
        setReason("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">تعويض / إضافة رصيد يدوي</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="w-phone">جوال العميل</Label>
            <div className="flex gap-2" dir="ltr">
              <span className="flex items-center rounded-md border bg-muted px-3 text-sm font-mono">
                +966
              </span>
              <Input
                id="w-phone"
                dir="ltr"
                inputMode="numeric"
                pattern="5\d{8}"
                maxLength={9}
                placeholder="5XXXXXXXX"
                value={phoneLocal}
                onChange={(e) =>
                  setPhoneLocal(e.target.value.replace(/\D/g, "").slice(0, 9))
                }
                required
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="w-amount">المبلغ (ر.س)</Label>
            <Input
              id="w-amount"
              type="number"
              step="any"
              dir="ltr"
              placeholder="مثال: 25 (أو -10 لتصحيح)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              موجب = إضافة رصيد، سالب = خصم (لا يتجاوز رصيد العميل).
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="w-reason">السبب (يظهر للعميل)</Label>
            <Textarea
              id="w-reason"
              placeholder="مثال: تعويض عن تأخير الطلب"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              إضافة إلى المحفظة
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
