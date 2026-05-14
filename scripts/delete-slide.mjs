// One-off helper to delete an onboarding slide and its image.
// Usage:
//   node --env-file=.env.local scripts/delete-slide.mjs <slide-id>

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sir.sa";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin1234";

const [, , slideId] = process.argv;
if (!slideId) {
  console.error("Usage: node --env-file=.env.local scripts/delete-slide.mjs <slide-id>");
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: authErr } = await supabase.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});
if (authErr) throw authErr;

const { data: row } = await supabase
  .from("onboarding_slides")
  .select("image_url")
  .eq("id", slideId)
  .maybeSingle();

if (!row) {
  console.error(`No slide with id ${slideId}`);
  process.exit(1);
}

const { error: delErr } = await supabase
  .from("onboarding_slides")
  .delete()
  .eq("id", slideId);
if (delErr) throw delErr;

// Best-effort image cleanup. The prefix the upload script used is
// `${url}/storage/v1/object/public/onboarding-images/`.
const prefix = `${url}/storage/v1/object/public/onboarding-images/`;
if (row.image_url?.startsWith(prefix)) {
  const path = row.image_url.slice(prefix.length);
  await supabase.storage.from("onboarding-images").remove([path]);
  console.log(`Deleted row + file: ${path}`);
} else {
  console.log("Row deleted, but image_url did not match the onboarding bucket — left file alone.");
}
