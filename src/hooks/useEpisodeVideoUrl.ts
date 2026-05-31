import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_PUBLIC_RE = /\/storage\/v1\/object\/public\/episode-videos\//;

/**
 * Resolves a playable URL for an episode. For Supabase-stored videos we always
 * fetch a short-lived SIGNED URL via the `resolve-episode-video` edge function
 * so subscription gating is enforced server-side. External URLs (e.g. Cloudinary)
 * are returned as-is.
 */
export function useEpisodeVideoUrl(episode: {
  id: string;
  video_url: string | null;
  is_free: boolean;
} | null) {
  const [url, setUrl] = useState<string | null>(episode?.video_url ?? null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!episode || !episode.video_url) {
      setUrl(null);
      return;
    }
    // Only round-trip when the file lives in our private bucket.
    if (!SUPABASE_PUBLIC_RE.test(episode.video_url)) {
      setUrl(episode.video_url);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke(
        "resolve-episode-video",
        { body: { episode_id: episode.id } },
      );
      if (cancelled) return;
      if (error || !data?.granted) {
        setDenied(true);
        setUrl(null);
        return;
      }
      setUrl(data.url ?? null);
      setDenied(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [episode?.id, episode?.video_url]);

  return { url, denied };
}
