// TEMPORARY QA helper. Delete after testing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const TOKEN = "qa_9f3kd82mzq71xv04plus";
Deno.serve(async (req) => {
  const b = await req.json().catch(() => ({}));
  if (b.token !== TOKEN) return new Response("no", { status: 403 });
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const out: Record<string, unknown> = {};
  if (b.action === "create") {
    const now = Date.now();
    for (const kind of ["free", "paid", "comp", "expired"]) {
      const email = `qa-plus-${kind}@example.com`;
      const { data, error } = await a.auth.admin.createUser({ email, password: b.password, email_confirm: true });
      if (error) { out[kind] = error.message; continue; }
      const id = data.user.id;
      const row = (sub: string, price: string, end: string | null, env: string) => ({
        user_id: id, stripe_subscription_id: sub, stripe_customer_id: sub, product_id: price, price_id: price,
        status: "active", current_period_start: new Date(now).toISOString(), current_period_end: end, cancel_at_period_end: false, environment: env,
      });
      if (kind === "paid") await a.from("subscriptions").insert(row(`sub_qa_${id}`, "uwazi_plus_monthly", new Date(now + 30 * 864e5).toISOString(), "sandbox"));
      if (kind === "comp") await a.from("subscriptions").insert(row(`comp_${id}`, "comp_free", null, "live"));
      if (kind === "expired") await a.from("subscriptions").insert(row(`comp_${id}`, "comp_free", new Date(now - 864e5).toISOString(), "live"));
      const { data: s } = await a.from("compass_sessions").insert({ user_id: id, completed_at: new Date().toISOString() }).select("id").single();
      out[kind] = { id, session: s?.id };
    }
  }
  if (b.action === "delete") {
    const { data } = await a.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data.users.filter((u) => u.email?.startsWith("qa-plus-"))) {
      for (const t of ["subscriptions", "compass_sessions", "user_lesson_progress", "ask_usage", "episode_video_access_log", "uwazi_question_log", "learn_path_offers", "civic_scores", "streaks", "user_points_ledger", "profiles", "user_preferences", "user_roles", "notification_prefs"]) {
        const { error } = await a.from(t).delete().eq("user_id", u.id);
        if (error) out[`${t}`] = error.message;
      }
      const { error } = await a.auth.admin.deleteUser(u.id);
      out[u.email!] = error?.message ?? "deleted";
    }
  }
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
