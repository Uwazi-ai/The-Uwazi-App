import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LibraryVideo = { id: string; title: string; description: string; tag: string; length_seconds: number; url: string; poster_url: string; dimension_slug: string | null; placement: "home_row" | "welcome" | "both"; sort_order: number; active: boolean; created_at: string };
export const VIDEO_BUCKET = "home-video-media";

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