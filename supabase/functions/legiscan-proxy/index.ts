import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { op, state, query, bill_id, session_id } = body;

    const apiKey = (Deno.env.get("LEGISCAN_API_KEY") || "").trim();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LegiScan API key not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const base = `https://api.legiscan.com/?key=${apiKey}`;
    let url = "";

    switch (op) {
      case "getSessionList":
        url = `${base}&op=getSessionList&state=${encodeURIComponent(state || "")}`;
        break;
      case "getMasterList":
        url = `${base}&op=getMasterListRaw&state=${encodeURIComponent(state || "")}`;
        if (session_id) url += `&id=${encodeURIComponent(session_id)}`;
        break;
      case "search":
        url = `${base}&op=search&state=${encodeURIComponent(state || "ALL")}&query=${encodeURIComponent(query || "")}&year=2`;
        break;
      case "getBill":
        url = `${base}&op=getBill&id=${encodeURIComponent(bill_id || "")}`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${op}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const response = await fetch(url);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("LegiScan proxy error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});