import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ ok: false, error: "not_signed_in" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify the caller with their own JWT (never sign in on the service client).
    const authClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ ok: false, error: "not_signed_in" }, 401);

    let body: { code?: unknown; campaign?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "invalid_request" }, 400);
    }

    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code || code.length > 64) return json({ ok: false, error: "invalid_request" }, 400);

    const service = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Single atomic transaction with SELECT ... FOR UPDATE inside the function.
    const { data, error } = await service.rpc("claim_promo_code", {
      _code: code,
      _user_id: userData.user.id,
    });

    if (error) {
      console.error("claim_promo_code failed", error.message);
      return json({ ok: false, error: "unknown" }, 500);
    }

    return json(data);
  } catch (e) {
    console.error("redeem-promo error", e);
    return json({ ok: false, error: "unknown" }, 500);
  }
});
