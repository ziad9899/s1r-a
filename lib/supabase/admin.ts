import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role / secret-key client. Bypasses RLS — use ONLY for admin-only
// operations (banning, deleting auth users) and ALWAYS gate the caller in
// the server action that wraps this client.
//
// The `server-only` import above makes the bundler throw if anything in a
// client component tries to import this file, so the secret never reaches
// the browser even by accident.
//
// Lazy init: missing env vars throw at call time (inside a server action)
// rather than at module-load time, so `next build` doesn't fail just
// because a contributor hasn't filled in their `.env.local` yet.

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!secret) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set — required for admin user actions",
    );
  }
  cached = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
