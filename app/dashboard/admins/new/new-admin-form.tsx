"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ADMIN_TIER_LABELS_AR,
  type AdminTier,
} from "@/lib/admin-roles";
import { inviteAdmin } from "../actions";

const ROLE_OPTIONS: { value: AdminTier; description: string }[] = [
  { value: "super_admin", description: "كل الصلاحيات بما فيها إضافة مسؤولين آخرين." },
  { value: "admin", description: "كل الصلاحيات عدا إدارة المسؤولين." },
  { value: "manager", description: "إدارة المحتوى (خدمات، فروع، فلاتر، بنرات، شرائح ترحيب)." },
  { value: "staff", description: "قراءة فقط + تحديث حالة الحجوزات." },
];

function generatePassword(): string {
  // 12 chars, mixed case + digits — meets the existing 8-char minimum
  // and is comfortable to copy-paste into a chat with the new admin.
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 12; i++) out += chars[buf[i] % chars.length];
  return out;
}

export function NewAdminForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminTier>("manager");

  function onAutoGenerate() {
    setPassword(generatePassword());
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    // Saudi-only phone: prefix +966 to a 9-digit local that must start with 5.
    if (!/^5\d{8}$/.test(phoneLocal)) {
      toast.error("رقم الجوال غير صالح. أدخل 9 خانات تبدأ بـ 5.");
      return;
    }
    const phoneE164 = `+966${phoneLocal}`;
    startTransition(async () => {
      const result = await inviteAdmin({
        firstName,
        lastName,
        phoneE164,
        email,
        password,
        role,
      });
      if (result.ok) {
        toast.success(`أُضيف ${firstName} كـ ${ADMIN_TIER_LABELS_AR[role]}`);
        router.push("/dashboard/admins");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">معلومات المسؤول</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="first">الاسم الأول</Label>
              <Input
                id="first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="last">الاسم الأخير</Label>
              <Input
                id="last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                minLength={2}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="phone">رقم الجوال</Label>
            <div className="flex gap-2" dir="ltr">
              <span className="flex items-center rounded-md border bg-muted px-3 text-sm font-mono">
                +966
              </span>
              <Input
                id="phone"
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
            <Label htmlFor="email">البريد الإلكتروني (للدخول)</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="font-mono text-sm"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="font-mono"
              />
              <Button type="button" variant="outline" onClick={onAutoGenerate}>
                توليد
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              احفظ كلمة المرور وسلّمها للمسؤول الجديد بشكل آمن. يمكنه تغييرها بعد الدخول.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>الدور</Label>
            <div className="grid gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                    role === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={role === opt.value}
                    onChange={() => setRole(opt.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">
                      {ADMIN_TIER_LABELS_AR[opt.value]}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {opt.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              إضافة المسؤول
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
