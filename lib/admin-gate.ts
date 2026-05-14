import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_TIERS, type AdminTier } from "@/lib/admin-roles";

// Defense-in-depth gate for server actions. Returns the caller's role on
// success so the action can apply tier-specific checks (e.g. only
// super_admin can manage admins). Service-role mutations bypass RLS, so
// these checks are load-bearing.

type GateOk = { ok: true; callerId: string; role: AdminTier };
type GateErr = { ok: false; error: string };

async function gate(allowed: readonly AdminTier[]): Promise<GateOk | GateErr> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "غير مسجّل دخول." };
  }
  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = me?.role as AdminTier | undefined;
  if (meErr || !role || !allowed.includes(role)) {
    return { ok: false, error: "صلاحية غير كافية." };
  }
  return { ok: true, callerId: user.id, role };
}

export async function assertCallerIsAdmin() {
  return gate(["super_admin", "admin"]);
}

export async function assertCallerIsSuperAdmin() {
  return gate(["super_admin"]);
}

export async function assertCallerCanManageContent() {
  return gate(["super_admin", "admin", "manager"]);
}

export async function assertCallerHasAdminAccess() {
  return gate(["super_admin", "admin", "manager", "staff"]);
}

// Re-export for older imports — new code should import from admin-roles.
export { ADMIN_TIERS };
export type { AdminTier };
