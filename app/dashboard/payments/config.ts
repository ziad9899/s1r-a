// Plain (non-"use server") module: shared constants/types for the payments
// page. A "use server" file may export ONLY async functions, so these live here.

// Credential names — MUST match the env-var names the Edge Functions read, so a
// Vault value seamlessly overrides the env fallback (functions/_shared/secrets.ts).
export const SECRET_NAMES = [
  "MOYASAR_SECRET_KEY",
  "MOYASAR_WEBHOOK_SECRET",
  "TABBY_SECRET_KEY",
  "TABBY_MERCHANT_CODE",
  "TABBY_WEBHOOK_SECRET",
  "MADFU_AUTH",
  "MADFU_APP_CODE",
  "MADFU_API_KEY",
  "MADFU_WEBHOOK_SECRET",
] as const;

export type SavePaymentInput = {
  tabbyEnabled: boolean;
  madfuEnabled: boolean;
  // name -> new value. Only NON-EMPTY entries are written (write-only fields).
  secrets: Record<string, string>;
};
