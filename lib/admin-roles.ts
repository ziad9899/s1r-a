// Client-safe role constants. No server imports here — both client
// components (the role-picker form, the actions menu) and server actions
// can import freely.

export const ADMIN_TIERS = [
  "super_admin",
  "admin",
  "manager",
  "staff",
] as const;
export type AdminTier = (typeof ADMIN_TIERS)[number];

export const ADMIN_TIER_LABELS_AR: Record<AdminTier, string> = {
  super_admin: "مسؤول أعلى",
  admin: "مسؤول",
  manager: "مدير",
  staff: "موظف",
};
