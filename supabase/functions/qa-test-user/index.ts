// TEMPORARY QA helper. Admin only. Creates or deletes one confirmed free test
// account without sending any email. Delete this function after QA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) return json({ error: "unauthorized" }, 401);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: u.user.id });
  if (!isAdmin) return json({ error: "forbidden" }, 403);
  const { action, email, password, user_id } = await req.json().catch(() => ({}));
  if (action === "create") {
    if (!/^qa-free-.+@example\.com$/.test(email ?? "")) return json({ error: "bad email" }, 400);
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return json({ error: error.message }, 400);
    const id = data.user.id;
    await admin.from("profiles").update({ onboarding_complete: true, display_name: "QA Free", zip_code: "64106", city: "Kansas City", state_code: "MO" }).eq("user_id", id);
    return json({ user_id: id });
  }
  if (action === "delete") {
    const { data: target } = await admin.auth.admin.getUserById(user_id);
    if (!target?.user?.email?.startsWith("qa-free-")) return json({ error: "not a QA user" }, 400);
    const { error } = await admin.auth.admin.deleteUser(user_id);
    return error ? json({ error: error.message }, 400) : json({ deleted: true });
  }
  return json({ error: "bad action" }, 400);
});
