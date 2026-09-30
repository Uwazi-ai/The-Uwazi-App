import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEpisodeVideoUrl } from "@/hooks/useEpisodeVideoUrl";

export type LibraryVideo = { id: string; title: string; description: string; tag: string; length_seconds: number; url: string; poster_url: string; dimension_slug: string | null; placement: "home_row" | "welcome" | "both"; sort_order: number; active: boolean; created_at: string; episode_id?: string | null; is_free?: boolean };
export const VIDEO_BUCKET = "home-video-media";

export type EpisodeRow = { id: string; title: string; description: string | null; topic: string; video_url: string | null; is_free: boolean; sort_order: number | null; created_at: string };

// Presents an older episode with the same shape the home video row uses.
export function episodeToVideo(episode: EpisodeRow): LibraryVideo {
  return {
    id: episode.id,
    title: episode.title,
    description: episode.description ?? "",
    tag: episode.topic,
    length_seconds: 0,
    url: episode.video_url ?? "",
    poster_url: "",
    dimension_slug: null,
    placement: "home_row",
    sort_order: episode.sort_order ?? 0,
    active: true,
    created_at: episode.created_at,
    episode_id: episode.id,
    is_free: episode.is_free,
  };
}

export async function mediaUrl(value: string): Promise<string> {
  const marker = `/storage/v1/object/public/${VIDEO_BUCKET}/`;
  const index = value.indexOf(marker);
  if (index < 0) return value;
  const path = decodeURIComponent(value.slice(index + marker.length).split("?")[0]);
  const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new Error("This video is not available right now.");
  return data.signedUrl;
}

export function useVideoSource(value: string | undefined) {
  // This hook is kept here so all private media is resolved in one place.
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    setUrl(undefined);
    if (!value) return;
    let alive = true;
    mediaUrl(value).then((resolved) => { if (alive) setUrl(resolved); }).catch(() => {});
    return () => { alive = false; };
  }, [value]);
  return url;
}

// Resolves a playable source for either a library video or an older episode.
export function useMediaSource(item: LibraryVideo | null | undefined, enabled = true) {
  const direct = useVideoSource(enabled && item && !item.episode_id ? item.url : undefined);
  const { url: episodeUrl } = useEpisodeVideoUrl(
    enabled && item?.episode_id ? { id: item.episode_id, video_url: item.url, is_free: item.is_free ?? true } : null,
  );
  if (!item) return undefined;
  return item.episode_id ? episodeUrl ?? undefined : direct;
}