import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  street: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}$/),
});

const DEMOCRACY_WORKS_BASE = "https://api.turbovote.org/elections/upcoming";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse & validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { street, city, state, zip } = parsed.data;

    const apiKey = Deno.env.get("DEMOCRACY_WORKS_API_KEY");

    let electionsData: any = null;

    if (apiKey) {
      // Call Democracy Works / TurboVote API
      const params = new URLSearchParams({
        "street-address": street,
        city,
        state,
        zip,
      });

      try {
        const apiRes = await fetch(`${DEMOCRACY_WORKS_BASE}?${params}`, {
          headers: {
            Accept: "application/json",
            Authorization: `apikey ${apiKey}`,
          },
        });

        if (apiRes.ok) {
          electionsData = await apiRes.json();
        } else {
          console.error(
            `Democracy Works API error: ${apiRes.status} ${await apiRes.text()}`
          );
        }
      } catch (e) {
        console.error("Democracy Works API fetch failed:", e);
      }
    }

    // If no API key or API failed, build a helpful fallback response
    if (!electionsData) {
      electionsData = buildFallbackElections(state, zip);
    }

    // Cache in profiles
    const adminClient = createClient(supabaseUrl, serviceKey);
    await adminClient
      .from("profiles")
      .update({
        voter_elections_data: electionsData,
        voter_elections_cached_at: new Date().toISOString(),
        address_line1: street,
        city,
        state_code: state,
        zip_code: zip,
        full_address: `${street}, ${city}, ${state} ${zip}`,
        street_address: street,
      })
      .eq("user_id", user.id);

    return new Response(JSON.stringify(electionsData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-voter-elections error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Build a fallback elections response using known 2026 midterm data
 * when the Democracy Works API key is not configured or the call fails.
 */
function buildFallbackElections(state: string, zip: string) {
  const generalDate = "2026-11-03";

  const STATE_PRIMARY_DATES: Record<string, string> = {
    IL: "2026-03-17", TX: "2026-03-03", OH: "2026-05-05",
    NC: "2026-03-17", CA: "2026-06-02", FL: "2026-08-18",
    GA: "2026-05-19", PA: "2026-05-19", MI: "2026-08-04",
    MO: "2026-08-04", KS: "2026-08-04", NY: "2026-06-23",
    VA: "2026-06-09", WA: "2026-08-04", OR: "2026-05-19",
    CO: "2026-06-23", AZ: "2026-08-04", NV: "2026-06-09",
    WI: "2026-08-11", MN: "2026-08-11", IA: "2026-06-02",
    NJ: "2026-06-02", MD: "2026-07-21", MA: "2026-09-15",
  };

  const elections: any[] = [];
  const now = new Date();

  const primaryStr = STATE_PRIMARY_DATES[state];
  if (primaryStr && new Date(`${primaryStr}T00:00:00`) > now) {
    elections.push({
      id: `${state}-primary-2026`,
      name: `${state} Primary Election`,
      date: primaryStr,
      electionDay: primaryStr,
      status: "active",
      registrationDeadlines: {
        online: null,
        byMail: null,
        inPerson: null,
      },
      votingMethods: {
        byMail: true,
        earlyVoting: null,
        inPerson: true,
      },
      checkRegistrationUrl: `https://www.vote.org/am-i-registered-to-vote/`,
      registrationUrl: `https://www.vote.org/register-to-vote/`,
      pollingLocationUrl: `https://www.vote.org/polling-place-locator/`,
      contests: [],
      ballotMeasures: [],
    });
  }

  elections.push({
    id: "general-2026",
    name: "2026 Midterm General Election",
    date: generalDate,
    electionDay: generalDate,
    status: "active",
    registrationDeadlines: {
      online: null,
      byMail: null,
      inPerson: null,
    },
    votingMethods: {
      byMail: true,
      earlyVoting: null,
      inPerson: true,
    },
    checkRegistrationUrl: `https://www.vote.org/am-i-registered-to-vote/`,
    registrationUrl: `https://www.vote.org/register-to-vote/`,
    pollingLocationUrl: `https://www.vote.org/polling-place-locator/`,
    contests: [],
    ballotMeasures: [],
  });

  return { elections, source: "fallback", state, zip };
}
