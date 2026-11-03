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
    election_date: z.string().describe("ISO election date, e.g. 2026-11-03."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ state, election_date }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("ballot_contests")
      .select(
        "id, contest_type, measure_title, office_name, plain_summary, measure_summary, yes_means, no_means, fiscal_note, " +
          "measure_full_text_url, vote_for, source_name, source_url, sort_order, " +
          "scope_level, scope_counties, scope_district_type, scope_district_id, " +
          "ballot_candidates(id, name, party, is_incumbent, website, sort_order, withdrawn_at)",
      )
      .eq("state", state.toUpperCase())
      .eq("election_date", election_date)
      // Voters only ever see verified, scoped contests. Never return flagged or needs_review rows.
      .eq("verification_status", "verified")
      .not("scope_level", "is", null)
      .order("sort_order");

    if (error) return errorResult(error.message);
    return textResult({
      state: state.toUpperCase(),
      election_date,
      contest_count: data?.length ?? 0,
      contests: ((data ?? []) as any[]).map((c) => ({
        ...c,
        ballot_candidates: (c.ballot_candidates ?? []).filter((x: any) => !x.withdrawn_at).map(({ withdrawn_at: _w, ...x }: any) => x),
      })),
      note:
        "Verified contests only. Statewide contests apply to every voter in the state; county and district contests (scope fields) apply only to voters there. " +
        "UWAZI is strictly nonpartisan and does not endorse candidates, parties, or positions. " +
        "Present only the contests listed here; for anything else refer the voter to their county election authority.",
    });
  },
});
