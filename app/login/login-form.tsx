"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm() {
  const search = useSearchParams();
  const reason = search.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      toast.error(error?.message ?? "تعذّر تسجيل الدخول.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    // Any admin tier may log in — the middleware enforces per-path access
    // beyond that (e.g. /dashboard/admins is super_admin only).
    const ADMIN_TIERS = ["super_admin", "admin", "manager", "staff"];
    if (!profile?.role || !ADMIN_TIERS.includes(profile.role)) {
      await supabase.auth.signOut();
      toast.error("هذا الحساب ليس من المسؤولين.");
      setLoading(false);
      return;
    }

    toast.success("أهلاً بك");
    const from = search.get("from") ?? "/dashboard";
    // Full reload so the freshly-written auth cookies are guaranteed to
    // reach the proxy on the next request. router.replace fires an RSC
    // fetch before @supabase/ssr finishes persisting cookies.
    window.location.assign(from);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <img
          src="/icon.png"
          alt="S1R"
          className="mx-auto mb-3 h-14 w-14 object-contain"
        />
        <CardTitle className="text-2xl">لوحة تحكم S1R</CardTitle>
        <p className="text-sm text-muted-foreground">
          للمسؤولين فقط. سجّل دخولك بإيميل المدير وكلمة المرور.
        </p>
      </CardHeader>
      <CardContent>
        {reason === "not-admin" && (
          <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            الحساب الذي سجّلت به ليس من المسؤولين.
          </p>
        )}
        {reason === "idle" && (
          <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            خرجنا من حسابك تلقائياً بعد فترة خمول. سجّل دخولك من جديد للمتابعة.
          </p>
        )}
        {reason === "insufficient-role" && (
          <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            صلاحيتك لا تسمح بفتح تلك الصفحة.
          </p>
        )}
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جارٍ التحقّق...
              </>
            ) : (
              "تسجيل الدخول"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
