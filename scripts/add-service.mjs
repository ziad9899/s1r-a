// Quick smoke test: insert a service as admin, verify anon read.
// Usage: node --env-file=.env.local scripts/add-service.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: authErr } = await supabase.auth.signInWithPassword({
  email: process.env.ADMIN_EMAIL ?? "admin@sir.sa",
  password: process.env.ADMIN_PASSWORD ?? "Admin1234",
});
if (authErr) {
  console.error("Auth failed:", authErr.message);
  process.exit(1);
}

const service = {
  id: "carwash",
  name: "غسيل سيارات",
  name_en: "Car Wash",
  starting_price_sar: 80,
  icon_key: "sparkles",
  duration_label: "30 دقيقة",
  duration_label_en: "30 minutes",
  sort_order: 99,
  active: true,
};

console.log(`→ Inserting service "${service.id}"…`);
const { error: insertErr } = await supabase.from("services").insert(service);
if (insertErr) {
  if (insertErr.code === "23505") {
    console.log(`  already exists — skipping insert`);
  } else {
    console.error("Insert failed:", insertErr.message);
    process.exit(1);
  }
} else {
  console.log(`  ✓ inserted`);
}

console.log("\n→ Verifying anon read…");
const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data, error } = await anon
  .from("services")
  .select("id,name,starting_price_sar,active")
  .order("sort_order");
if (error) {
  console.error(`  anon read FAILED: ${error.message}`);
  process.exit(1);
}
console.log(`  anon sees ${data.length} service(s):`);
for (const s of data) {
  console.log(`   • [${s.id}] ${s.name} — ${s.starting_price_sar} SAR  ${s.active ? "✓" : "(inactive)"}`);
}
