import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check caller is admin
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const targetUserId = body.user_id;
    const action = body.action; // "grant" or "revoke"
    const environment = body.environment || "live";

    if (!targetUserId || !["grant", "revoke"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid params: need user_id and action (grant|revoke)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "grant") {
      // Check if user already has an active comp subscription
      const { data: existing } = await adminClient
        .from("subscriptions")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("environment", environment)
        .like("stripe_subscription_id", "comp_%")
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ message: "User already has complimentary UWAZI+" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert a complimentary subscription (no expiry)
      const { error: insertErr } = await adminClient.from("subscriptions").insert({
        user_id: targetUserId,
        stripe_subscription_id: `comp_${targetUserId}`,
        stripe_customer_id: `comp_${targetUserId}`,
        product_id: "comp_uwazi_plus",
        price_id: "comp_free",
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: null,
        cancel_at_period_end: false,
        environment,
      });

      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "UWAZI+ granted" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Revoke
    const { error: deleteErr } = await adminClient
      .from("subscriptions")
      .delete()
      .eq("user_id", targetUserId)
      .eq("environment", environment)
      .like("stripe_subscription_id", "comp_%");

    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "UWAZI+ revoked" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
