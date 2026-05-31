// Returns a playable URL for an episode, gated server-side by subscription.
// For Supabase-stored objects, returns a short-lived SIGNED URL so the file
// cannot be reached via the legacy /object/public/ path.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Match `/storage/v1/object/public/episode-videos/<path>` and capture the path.
const SUPABASE_PUBLIC_RE = /\/storage\/v1\/object\/public\/episode-videos\/(.+)$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { episode_id } = await req.json().catch(() => ({}));
    if (!episode_id || typeof episode_id !== "string") {
      return json({ error: "episode_id required" }, 400);
    }

    // Identify caller (anon allowed for free episodes).
    const authHeader = req.headers.get("Authorization") ?? "";
    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const { data: ep, error: epErr } = await admin
      .from("episodes")
      .select("id, is_free, is_published, video_url")
      .eq("id", episode_id)
      .maybeSingle();

    if (epErr || !ep) return json({ error: "not_found" }, 404);

    // Server-side gating + audit log.
    const { data: gate, error: gateErr } = await admin.rpc(
      "log_episode_video_access",
      {
        _user_id: userId,
        _episode_id: episode_id,
        _video_path: ep.video_url,
        _context: { source: "resolve-episode-video" },
      },
    );
    if (gateErr) return json({ error: "gate_failed" }, 500);
    const result = Array.isArray(gate) ? gate[0] : gate;
    if (!result?.granted) {
      return json({ granted: false, reason: result?.reason ?? "denied" }, 403);
    }

    let url = ep.video_url as string | null;
    if (url) {
      const match = url.match(SUPABASE_PUBLIC_RE);
      if (match) {
        const path = match[1];
        const { data: signed, error: signErr } = await admin.storage
          .from("episode-videos")
          .createSignedUrl(path, 60 * 60); // 1 hour
        if (signErr || !signed?.signedUrl) {
          return json({ error: "sign_failed" }, 500);
        }
        url = signed.signedUrl;
      }
    }

    return json({ granted: true, reason: result.reason, url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
