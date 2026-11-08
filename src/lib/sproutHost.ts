import { supabase } from "@/integrations/supabase/client";
import type { ParentEvent, SaveData, SproutHost } from "@sprout/index";

/** Private bucket holding one family's recorded voice clips and the hero face photo. */
export const SPROUT_BUCKET = "kid-media";
export const SPROUT_CHILD = "kaleb";

const db = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };

export const voiceClipPath = (userId: string, voice: "mama" | "myke", key: string) => `${userId}/voice/${voice}/${key}.webm`;
export const facePhotoPath = (userId: string) => `${userId}/hero-face.jpg`;

/**
 * Builds the host the game talks to. Progress goes through reviewed RPCs, media through signed
 * URLs on the private bucket, and parent events through log_kid_event, which also posts a
 * notification. The game never sees the Supabase client.
 */
export function makeSproutHost(userId: string, ui: { openGrownUpTools: (tab: "voice" | "photo") => void; exit: () => void }): SproutHost {
  const signed = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage.from(SPROUT_BUCKET).createSignedUrl(path, 60 * 60);
      return error ? null : data?.signedUrl ?? null;
    } catch { return null; }
  };
  return {
    async loadSave() {
      const { data, error } = await db.rpc("get_kid_progress", { _child: SPROUT_CHILD });
      if (error) throw new Error(error.message);
      return (data as SaveData | null) ?? null;
    },
    async saveProgress(save: SaveData) {
      const { error } = await db.rpc("save_kid_progress", { _child: SPROUT_CHILD, _data: save });
      if (error) throw new Error(error.message);
    },
    async logParentEvent(event: ParentEvent) {
      try { await db.rpc("log_kid_event", { _child: SPROUT_CHILD, _kind: event.kind, _title: event.title, _body: event.body }); } catch { /* a missed memory never blocks play */ }
    },
    getVoiceClipUrl: (voice, key) => signed(voiceClipPath(userId, voice, key)),
    getFacePhotoUrl: () => signed(facePhotoPath(userId)),
    openGrownUpTools: ui.openGrownUpTools,
    exit: ui.exit,
  };
}
