import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_PUBLIC_RE = /\/storage\/v1\/object\/public\/episode-videos\//;
const EXTERNAL_URL_RE = /^https?:\/\//i;

function isStored(videoUrl: string) {
  return SUPABASE_PUBLIC_RE.test(videoUrl) || !EXTERNAL_URL_RE.test(videoUrl);
}

// Signed links are reused across Home and Watch so each episode is resolved once.
const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();

function resolveStored(id: string): Promise<string | null> {
  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.url);
  const pending = inflight.get(id);
  if (pending) return pending;
  const p = supabase.functions
    .invoke("resolve-episode-video", { body: { episode_id: id } })
    .then(({ data, error }) => {
      if (error || !data?.granted || !data?.url) return null;
      // Signed links last longer than this; refresh well before they expire.
      cache.set(id, { url: data.url, expires: Date.now() + 30 * 60 * 1000 });
      return data.url as string;
    })
    .catch(() => null)
    .finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

/**
 * Resolves a playable URL for an episode. Stored videos always go through the
 * gated `resolve-episode-video` function. External links are returned as is.
 * A stored path is never handed to the player directly, since it is not a URL.
 */
export function useEpisodeVideoUrl(episode: {
  id: string;
  video_url: string | null;
  is_free: boolean;
} | null) {
  const initial = (() => {
    if (!episode?.video_url) return null;
    if (!isStored(episode.video_url)) return episode.video_url;
    const hit = cache.get(episode.id);
    return hit && hit.expires > Date.now() ? hit.url : null;
  })();
  const [url, setUrl] = useState<string | null>(initial);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!episode || !episode.video_url) {
      setUrl(null);
      return;
    }
    if (!isStored(episode.video_url)) {
      setUrl(episode.video_url);
      return;
    }
    let cancelled = false;
    const hit = cache.get(episode.id);
    setUrl(hit && hit.expires > Date.now() ? hit.url : null);
    resolveStored(episode.id).then((resolved) => {
      if (cancelled) return;
      setDenied(!resolved);
      setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [episode?.id, episode?.video_url]);

  return { url, denied };
}
