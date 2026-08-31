import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { WalletConfigForm } from "./wallet-config-form";
import { WalletCreditForm } from "./wallet-credit-form";

const AR_DATETIME = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const TYPE_LABEL: Record<string, string> = {
  cashback: "كاش باك",
  referral_referrer: "مكافأة دعوة (داعٍ)",
  referral_referee: "مكافأة دعوة (صديق)",
  compensation: "تعويض",
  redeem: "خصم من الرصيد",
  reversal: "استرجاع",
  adjustment: "تعديل",
};

type LedgerRow = {
  user_id: string;
  amount_sar: number;
  entry_type: string;
  reason: string | null;
  created_at: string;
};

export default async function WalletPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Money page → super_admin only.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if (me?.role !== "super_admin") redirect("/dashboard");

  // Config
  const { data: settingsRows } = await supabase
    .from("app_settings")
    .select("key,value");
  const initial: Record<string, string> = {};
  for (const row of (settingsRows ?? []) as { key: string; value: string | null }[]) {
    initial[row.key] = row.value ?? "";
  }

  // Recent activity (latest 20) + the customers behind them.
  const { data: ledger } = await supabase
    .from("wallet_ledger")
    .select("user_id, amount_sar, entry_type, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = (ledger ?? []) as LedgerRow[];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, phone")
      .in("id", ids);
    for (const p of (profs ?? []) as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
    }[]) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      names.set(p.id, name || p.phone || "—");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">المحفظة والكاش باك</h1>
        <p className="text-sm text-muted-foreground">
          تحكّم كامل في المحفظة والكاش باك ونظام الدعوة، وإضافة تعويض يدوي لأي عميل.
        </p>
      </div>

      <WalletConfigForm initial={initial} />

      <WalletCreditForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">أحدث عمليات المحفظة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العميل</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>السبب</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-10"
                    >
                      لا توجد عمليات بعد.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r, i) => {
                  const credit = Number(r.amount_sar) >= 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {names.get(r.user_id) ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {TYPE_LABEL[r.entry_type] ?? r.entry_type}
                      </TableCell>
                      <TableCell
                        dir="ltr"
                        className={
                          credit
                            ? "font-mono text-emerald-600"
                            : "font-mono text-rose-600"
                        }
                      >
                        {credit ? "+" : "−"}
                        {Math.abs(Number(r.amount_sar))} ر.س
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[16rem] truncate">
                        {r.reason ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {AR_DATETIME.format(new Date(r.created_at))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
