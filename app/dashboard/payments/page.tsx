import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { PaymentsForm } from "./payments-form";
import { SECRET_NAMES } from "./config";

// Per-request only: reads live settings + service-role Vault status; never
// statically prerendered (avoids running getSupabaseAdmin at build time).
export const dynamic = "force-dynamic";

// Payment configuration — super_admin only (this page writes live gateway
// credentials). Provider on/off toggles live in app_settings (app-visible);
// the SECRET credentials live encrypted in Supabase Vault and are read here
// only to render a masked "••1234 / not set" status — full values never reach
// the browser.
export default async function PaymentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if (me?.role !== "super_admin") redirect("/dashboard");

  // Toggles (RLS public-read, so the server client can read them).
  const { data: rows } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["tabby_enabled", "madfu_enabled"]);
  const settings: Record<string, string> = {};
  for (const r of (rows ?? []) as { key: string; value: string | null }[]) {
    settings[r.key] = r.value ?? "";
  }

  // Masked credential status from Vault (service role). We show only the last 4
  // chars so the admin can confirm which key is set without ever exposing it.
  const admin = getSupabaseAdmin();
  const masks: Record<string, string | null> = {};
  for (const name of SECRET_NAMES) {
    try {
      const { data } = await admin.rpc("get_payment_secret", { p_name: name });
      masks[name] =
        typeof data === "string" && data.length > 0
          ? `••••${data.slice(-4)}`
          : null;
    } catch {
      masks[name] = null;
    }
  }

  return (
    <PaymentsForm
      tabbyEnabled={settings["tabby_enabled"] === "true"}
      madfuEnabled={settings["madfu_enabled"] === "true"}
      masks={masks}
    />
  );
}
