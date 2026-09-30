import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Free people get 5 typed questions per rolling 12 hours. Plus is never capped.
const FREE_LIMIT = 5;
const WINDOW_HOURS = 12;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json(401, { error: "Missing auth token" });
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authClient.auth.getUser(token);
    if (!userData?.user) return json(401, { error: "Invalid token" });
    const userId = userData.user.id;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    // Only a server call with count=true counts. Browser peeks never count.
    const isServer = req.headers.get("x-uwazi-internal") === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const count = isServer && body?.count === true;

    const { data, error } = await admin.rpc("consume_ask_question", {
      _user_id: userId, _count: count, _limit: FREE_LIMIT, _hours: WINDOW_HOURS,
    });
    if (error) { console.error(error); return json(500, { error: "Database error" }); }
    const r = data as { allowed: boolean; is_plus: boolean; used: number | null; remaining: number | null; reset_at: string | null };
    const blocked = !r.is_plus && (r.allowed === false || (!count && (r.remaining ?? 1) <= 0));
    if (blocked && count) {
      await admin.from("uwazi_question_log").insert({ user_id: userId, question_text: "[rate_limited]", was_rate_limited: true });
    }
    return json(blocked ? 429 : 200, {
      allowed: !blocked,
      is_plus: r.is_plus,
      questions_used: r.used,
      questions_remaining: r.remaining,
      reset_at: r.reset_at,
      limit: FREE_LIMIT,
    });
  } catch (e) {
    console.error("[check-ask-limit] error:", e);
    return json(500, { error: "Internal error" });
  }
});
