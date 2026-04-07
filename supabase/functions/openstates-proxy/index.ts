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
    const { query = "", state = "", subject = "", first = 20 } = body;

    const apiKey =
      Deno.env.get("OPENSTATES_API_KEY") ||
      Deno.env.get("VITE_OPENSTATES_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenStates API key not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const graphqlQuery = `
      query Bills($query: String, $jurisdiction: String, $subject: [String!], $first: Int) {
        bills(
          first: $first
          searchQuery: $query
          jurisdiction: $jurisdiction
          subject: $subject
          sort: "updated_asc"
        ) {
          edges {
            node {
              id
              title
              identifier
              classification
              subject
              updatedAt
              createdAt
              session
              jurisdiction {
                name
                id
              }
              sponsorships {
                name
                primary
                classification
              }
              abstracts {
                abstract
              }
              latestActionDescription
              latestActionDate
              openstatesUrl
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    `;

    const variables: Record<string, unknown> = { first: Math.min(first, 50) };
    if (query) variables.query = query;
    if (state) variables.jurisdiction = state;
    if (subject) variables.subject = [subject];

    const response = await fetch("https://v3.openstates.org/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ query: graphqlQuery, variables }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error("OpenStates GraphQL errors:", JSON.stringify(data.errors));
      return new Response(JSON.stringify({ error: data.errors[0]?.message || "GraphQL error" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bills = (data.data?.bills?.edges || []).map((e: any) => e.node);
    const totalCount = data.data?.bills?.totalCount || 0;
    const pageInfo = data.data?.bills?.pageInfo || {};

    return new Response(
      JSON.stringify({ bills, totalCount, pageInfo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("OpenStates proxy error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
