/**
 * Strips privileged fields (is_admin, is_suspended) from profile update payloads.
 * Defense-in-depth: PostgreSQL column grants and a trigger already block these
 * for non-admins, but we strip them client-side too so accidental writes never
 * leave the browser.
 */
const PROTECTED_PROFILE_FIELDS = ["is_admin", "is_suspended"] as const;

export function sanitizeProfileUpdate<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const clean: Record<string, unknown> = { ...payload };
  for (const key of PROTECTED_PROFILE_FIELDS) {
    if (key in clean) {
      // eslint-disable-next-line no-console
      console.warn(`[profileSanitizer] stripped protected field "${key}" from update payload`);
      delete clean[key];
    }
  }
  return clean as Partial<T>;
}
