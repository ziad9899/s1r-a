"use client";

import { createBrowserClient } from "@supabase/ssr";

// Used inside Client Components. Anon key only — RLS is the security boundary.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
