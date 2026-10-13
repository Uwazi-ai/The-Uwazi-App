// TEMPORARY QA helper. Admin only. Delete after Sprint 8C testing.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(URL_, SR);
  const auth = req.headers.get("Authorization") ?? "";
  const { data: u } = await createClient(URL_, ANON, { global: { headers: { Authorization: auth } } }).auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return j({ error: "unauthorized" }, 401);
  const { data: isAdm } = await admin.rpc("is_admin", { _user_id: u.user.id });
  if (!isAdm) return j({ error: "forbidden" }, 403);
  const b = await req.json().catch(() => ({}));
  if (b.action === "create") {
    const email = `qa8c-${crypto.randomUUID().slice(0, 8)}@example.invalid`;
    const password = crypto.randomUUID() + "Aa1!";
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return j({ error: error.message }, 500);
    const anon = createClient(URL_, ANON);
    const { data: s } = await anon.auth.signInWithPassword({ email, password });
    const uc = createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${s.session!.access_token}` } } });
    await uc.rpc("set_my_consent", { _personalization: true, _research: false });
    return j({ user_id: data.user!.id, access_token: s.session!.access_token });
  }
  if (b.action === "delete" && typeof b.user_id === "string") {
    const id = b.user_id;
    const tables = ["uwazi_question_log", "ask_usage", "ask_uwazi_model_log", "ask_uwazi_sessions", "ask_calibration_state", "civic_confidence",
      "user_civic_persona", "user_journey_next_step", "user_points_ledger", "ai_chats", "user_preferences", "notification_prefs", "streaks", "user_civic_stats", "persona_history", "profiles", "user_roles"];
    const left: Record<string, number> = {};
    for (const t of tables) {
      await admin.from(t).delete().eq("user_id", id);
      const { count } = await admin.from(t).select("*", { count: "exact", head: true }).eq("user_id", id);
      if (count) left[t] = count;
    }
    const { error } = await admin.auth.admin.deleteUser(id);
    return j({ deleted: !error, error: error?.message ?? null, left });
  }
  return j({ error: "bad action" }, 400);
});
