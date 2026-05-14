// Shared constants for ban presets. Lives in its own module because
// `actions.ts` is `"use server"` and can only export async functions —
// re-exporting an object from there breaks the server-actions loader.

// Go-duration values accepted by `auth.admin.updateUserById`. The unit `d`
// is not valid — multiply hours instead.
export const BAN_DURATIONS = {
  "24h": "24h",
  "7d": "168h",
  permanent: "876000h",
} as const;

export type BanPreset = keyof typeof BAN_DURATIONS;
