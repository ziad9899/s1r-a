import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Role tiers that may enter /dashboard/*. Mirrors the helpers in
// migration 0021 — keep in sync.
const DASHBOARD_TIERS = ["super_admin", "admin", "manager", "staff"] as const;
const SUPER_ADMIN_ONLY = ["super_admin"] as const;
const USER_MGMT_TIERS = ["super_admin", "admin"] as const;

// Per-path tier gate. Most pages accept any admin tier; sensitive surfaces
// (admin management, user moderation) need a higher level.
function requiredRolesForPath(path: string): readonly string[] {
  if (path.startsWith("/dashboard/admins")) return SUPER_ADMIN_ONLY;
  if (path.startsWith("/dashboard/users")) return USER_MGMT_TIERS;
  return DASHBOARD_TIERS;
}

// Refresh the auth cookie on every request and gate everything outside
// /login behind a signed-in admin-tier user.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(items) {
          for (const { name, value } of items) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of items) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path.startsWith("/login");
  const isPublicAsset =
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/api/health");

  if (isPublicAsset) return supabaseResponse;

  if (!user) {
    if (isLogin) return supabaseResponse;
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("from", path);
    return NextResponse.redirect(redirect);
  }

  // Resolve the user_role claim. The JWT carries it after the custom
  // access token hook is enabled; until then we fall back to profiles.
  const role =
    (user.app_metadata?.user_role as string | undefined) ??
    (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then((r) => r.data?.role as string | undefined));

  // Not even a baseline admin tier — kick to /login.
  if (!role || !(DASHBOARD_TIERS as readonly string[]).includes(role)) {
    if (isLogin) return supabaseResponse;
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("error", "not-admin");
    return NextResponse.redirect(redirect);
  }

  // Admin tier OK — now check the per-path requirement.
  const required = requiredRolesForPath(path);
  if (!required.includes(role)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.searchParams.set("error", "insufficient-role");
    return NextResponse.redirect(redirect);
  }

  if (isLogin) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return supabaseResponse;
}
