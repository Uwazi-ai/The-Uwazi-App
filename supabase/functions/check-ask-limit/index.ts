import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const FREE_LIMIT = 5;
const WINDOW_HOURS = 8;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json(401, { error: "Missing auth token" });

    // Verify JWT and get user
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: "Invalid token" });
    const userId = userData.user.id;

    // Service-role client for trusted reads/writes
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select("user_id, is_admin, ask_uwazi_question_count, ask_uwazi_window_start")
      .eq("user_id", userId)
      .maybeSingle();

    if (pErr) return json(500, { error: "Database error" });
    if (!profile) return json(401, { error: "Profile not found" });

    // Plus status: admin OR active subscription (sandbox or live)
    let isPlus = !!profile.is_admin;
    if (!isPlus) {
      const [{ data: liveOk }, { data: sbOk }] = await Promise.all([
        admin.rpc("has_active_subscription", { user_uuid: userId, check_env: "live" }),
        admin.rpc("has_active_subscription", { user_uuid: userId, check_env: "sandbox" }),
      ]);
      isPlus = !!liveOk || !!sbOk;
    }

    if (isPlus) {
      return json(200, {
        allowed: true,
        is_plus: true,
        questions_used: null,
        questions_remaining: null,
        reset_at: null,
      });
    }

    const now = new Date();
    const windowStart = profile.ask_uwazi_window_start
      ? new Date(profile.ask_uwazi_window_start)
      : null;
    const windowActive = windowStart && now.getTime() - windowStart.getTime() < WINDOW_MS;
    const count = profile.ask_uwazi_question_count ?? 0;

    // CASE A — expired/never started → reset
    if (!windowActive) {
      const newStart = now.toISOString();
      const { error: uErr } = await admin
        .from("profiles")
        .update({ ask_uwazi_question_count: 1, ask_uwazi_window_start: newStart })
        .eq("user_id", userId);
      if (uErr) return json(500, { error: "Database error" });
      return json(200, {
        allowed: true,
        is_plus: false,
        questions_used: 1,
        questions_remaining: FREE_LIMIT - 1,
        reset_at: new Date(now.getTime() + WINDOW_MS).toISOString(),
      });
    }

    const resetAt = new Date(windowStart!.getTime() + WINDOW_MS).toISOString();

    // CASE C — limit reached
    if (count >= FREE_LIMIT) {
      // Log the rate-limit hit so Intelligence dashboard can surface upgrade intent
      await admin.from("uwazi_question_log").insert({
        user_id: userId,
        question_text: "[rate_limited]",
        was_rate_limited: true,
      });
      return json(429, {
        allowed: false,
        is_plus: false,
        questions_used: FREE_LIMIT,
        questions_remaining: 0,
        reset_at: resetAt,
      });
    }

    // CASE B — increment
    const newCount = count + 1;
    const { error: uErr } = await admin
      .from("profiles")
      .update({ ask_uwazi_question_count: newCount })
      .eq("user_id", userId);
    if (uErr) return json(500, { error: "Database error" });

    return json(200, {
      allowed: true,
      is_plus: false,
      questions_used: newCount,
      questions_remaining: FREE_LIMIT - newCount,
      reset_at: resetAt,
    });
  } catch (e) {
    console.error("[check-ask-limit] error:", e);
    return json(500, { error: "Internal error" });
  }
});
