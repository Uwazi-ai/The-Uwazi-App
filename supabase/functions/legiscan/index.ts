import { corsHeaders } from "@supabase/supabase-js/cors";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const LEGISCAN_BASE = "https://api.legiscan.com";

const RequestSchema = z.object({
  op: z.enum(["search", "getBill", "getSessionList"]),
  params: z.record(z.string()).optional().default({}),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LEGISCAN_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LegiScan API key not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { op, params } = parsed.data;
    const searchParams = new URLSearchParams({ key: apiKey, op, ...params });
    const url = `${LEGISCAN_BASE}/?${searchParams.toString()}`;

    const response = await fetch(url);
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
