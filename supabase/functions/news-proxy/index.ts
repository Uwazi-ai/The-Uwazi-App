const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = "https://newsapi.org/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("NEWS_API_KEY") || Deno.env.get("VITE_NEWS_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "News API key not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { endpoint, params } = body;

    const ep = endpoint || "/everything";
    const url = new URL(`${BASE_URL}${ep}`);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("language", "en");
    if (params && typeof params === "object") {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
