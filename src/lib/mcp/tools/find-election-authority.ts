import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "find_election_authority",
  title: "Find election authority",
  description:
    "Look up the official local election authority for a state or county: display name, phone, website, registration lookup URL, and poll hours.",
  inputSchema: {
    state: z.string().optional().describe("Two-letter state code, e.g. MO."),
    county: z.string().optional().describe("County name, e.g. Jackson."),
    key: z.string().optional().describe("Known authority key, e.g. mo-kansas-city."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ state, county, key }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    if (!state && !county && !key) return errorResult("Provide a state, county, or key.");
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("election_authorities")
      .select("key, state, county_name, display_name, covers_note, phone, website, lookup_url, poll_hours")
      .limit(25);

    if (key) query = query.eq("key", key);
    if (state) query = query.eq("state", state.toUpperCase());
    if (county) query = query.ilike("county_name", `%${county}%`);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    if (!data?.length) {
      return textResult({
        found: false,
        fallback: "Direct the voter to vote.gov to find their local election office.",
      });
    }
    return textResult({ found: true, authorities: data });
  },
});
