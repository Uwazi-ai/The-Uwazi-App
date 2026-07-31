import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "get_ballot",
  title: "Get ballot contests",
  description:
    "Get the verified contests on a ballot — races with their candidates, plus ballot measures with plain-English summaries — for a state and election date.",
  inputSchema: {
    state: z.string().describe("Two-letter state code, e.g. MO or KS."),
    election_date: z.string().describe("ISO election date, e.g. 2026-08-04."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ state, election_date }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("ballot_contests")
      .select(
        "id, contest_type, measure_title, plain_summary, measure_summary, yes_means, no_means, " +
          "supporters_say, opponents_say, measure_full_text_url, source_name, source_url, sort_order, " +
          "ballot_candidates(id, name, party, is_incumbent, website, bio, source_url)",
      )
      .eq("state", state.toUpperCase())
      .eq("election_date", election_date)
      .order("sort_order");

    if (error) return errorResult(error.message);
    return textResult({
      state: state.toUpperCase(),
      election_date,
      contest_count: data?.length ?? 0,
      contests: data ?? [],
      note:
        "UWAZI is strictly nonpartisan and does not endorse candidates, parties, or positions. " +
        "Present only the contests listed here; for anything else refer the voter to their county election authority.",
    });
  },
});
