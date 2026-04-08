const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const GOOGLE_CIVIC_BASE = "https://www.googleapis.com/civicinfo/v2";

function emptyVoterInfoResponse(status: "no_election" | "invalid_address" = "no_election", message?: string) {
  return {
    status,
    message,
    pollingLocations: [],
    contests: [],
    earlyVoteSites: [],
    dropOffLocations: [],
  };
}

function isZipOnlyAddress(value?: string) {
  if (!value) return false;
  return /^\d{5}(?:-\d{4})?(?:\s+USA)?$/i.test(value.trim());
}

const RequestSchema = z.object({
  endpoint: z.enum(["/voterinfo", "/representatives", "/elections"]),
  params: z.record(z.string()).optional().default({}),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_CIVIC_API_KEY") || Deno.env.get("VITE_GOOGLE_CIVIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Google Civic API key not configured" }),
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

    const { endpoint, params } = parsed.data;
    const normalizedParams = { ...params };

    if (endpoint === "/voterinfo") {
      const address = normalizedParams.address?.trim();

      if (!address || isZipOnlyAddress(address)) {
        return new Response(
          JSON.stringify(
            emptyVoterInfoResponse("invalid_address", "A full street address is required to find voter information.")
          ),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      normalizedParams.address = address;
    }

    const searchParams = new URLSearchParams({ ...normalizedParams, key: apiKey });
    const url = `${GOOGLE_CIVIC_BASE}${endpoint}?${searchParams.toString()}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok && endpoint === "/voterinfo" && typeof data?.error?.message === "string") {
      const message = data.error.message.toLowerCase();

      if (message.includes("election unknown")) {
        return new Response(JSON.stringify(emptyVoterInfoResponse("no_election", data.error.message)), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (message.includes("failed to parse address")) {
        return new Response(
          JSON.stringify(
            emptyVoterInfoResponse("invalid_address", "A full street address is required to find voter information.")
          ),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
