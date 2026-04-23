import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_TTL = 60 * 60; // 1 hour
const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Convert a stored avatar value into a usable URL.
 *
 * The `profiles.avatar_url` column may contain:
 *  - a storage object path (e.g. "<userId>/avatar.png") — preferred
 *  - a legacy public Supabase URL (contains "/storage/v1/object/public/avatars/")
 *  - an external URL (Google/Apple OAuth) — returned as-is
 *  - null/empty — returns null
 *
 * For storage paths or legacy public Supabase URLs, a short-lived signed URL
 * is created against the now-private `avatars` bucket.
 */
export async function resolveAvatarUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;

  // External http(s) URL that is NOT a Supabase public storage URL → use directly
  const isHttp = /^https?:\/\//i.test(stored);
  const publicMarker = "/storage/v1/object/public/avatars/";
  let path: string | null = null;

  if (isHttp) {
    const idx = stored.indexOf(publicMarker);
    if (idx === -1) return stored; // external avatar (OAuth provider)
    // Extract storage object path, strip query string
    path = stored.slice(idx + publicMarker.length).split("?")[0];
  } else {
    path = stored.replace(/^\/+/, "").split("?")[0];
  }

  if (!path) return null;

  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.url;

  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) return null;

  cache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL * 1000,
  });
  return data.signedUrl;
}

/** Best-effort batch helper for admin lists. */
export async function resolveAvatarUrls(
  values: Array<string | null | undefined>
): Promise<Array<string | null>> {
  return Promise.all(values.map(resolveAvatarUrl));
}
