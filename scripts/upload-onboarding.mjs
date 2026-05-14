// One-off helper to upload an onboarding slide via the admin auth path.
// Usage:
//   node --env-file=.env.local scripts/upload-onboarding.mjs <image-path> "<title_ar>" "<body_ar>" [sort_order]

import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sir.sa";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin1234";

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const [, , imagePath, titleAr, bodyAr, sortOrderRaw] = process.argv;
if (!imagePath || !titleAr || !bodyAr) {
  console.error("Usage: node scripts/upload-onboarding.mjs <image-path> \"<title_ar>\" \"<body_ar>\" [sort_order]");
  process.exit(1);
}
const sortOrder = Number.parseInt(sortOrderRaw ?? "0", 10);

const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`→ Signing in as ${adminEmail}…`);
const { error: authErr } = await supabase.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});
if (authErr) {
  console.error("Auth failed:", authErr.message);
  process.exit(1);
}

const ext = extname(imagePath).slice(1).toLowerCase() || "jpg";
const contentTypeByExt = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const contentType = contentTypeByExt[ext] ?? "image/jpeg";
const path = `slides/${Date.now()}-${basename(imagePath)}`;

console.log(`→ Uploading ${imagePath} → ${path}…`);
const fileBytes = readFileSync(imagePath);
const { error: uploadErr } = await supabase.storage
  .from("onboarding-images")
  .upload(path, fileBytes, { contentType, upsert: false });
if (uploadErr) {
  console.error("Upload failed:", uploadErr.message);
  process.exit(1);
}

const { data: pub } = supabase.storage.from("onboarding-images").getPublicUrl(path);
const imageUrl = pub.publicUrl;
console.log(`  public URL: ${imageUrl}`);

console.log(`→ Inserting onboarding_slides row…`);
const { data: row, error: insertErr } = await supabase
  .from("onboarding_slides")
  .insert({
    image_url: imageUrl,
    title_ar: titleAr,
    body_ar: bodyAr,
    sort_order: sortOrder,
    is_active: true,
  })
  .select()
  .single();
if (insertErr) {
  console.error("Insert failed:", insertErr.message);
  process.exit(1);
}
console.log(`  slide id: ${row.id}`);

console.log("\n→ Verifying anon read (this is how the customer app reads)…");
const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: anonRows, error: anonErr } = await anon
  .from("onboarding_slides")
  .select("id,title_ar,image_url,is_active,sort_order")
  .order("sort_order");
if (anonErr) {
  console.error(`  anon read FAILED: ${anonErr.message}`);
  console.error(`  → run migration 0015_fix_anon_is_admin_execute.sql in Supabase SQL Editor`);
  process.exit(1);
}
console.log(`  anon sees ${anonRows.length} slide(s):`);
for (const r of anonRows) {
  console.log(`   • [${r.sort_order}] ${r.title_ar} — ${r.image_url}`);
}

console.log("\n✓ Done.");
