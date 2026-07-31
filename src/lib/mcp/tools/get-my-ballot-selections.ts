import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "get_my_ballot_selections",
  title: "Get my practice ballot",
  description:
    "Get the signed-in user's saved practice-ballot selections (chosen candidates and yes/no measure votes). This is a personal practice ballot, never an official one.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("user_ballot_selections")
      .select(
        "id, contest_id, candidate_id, measure_vote, party_snapshot, updated_at, " +
          "ballot_contests(contest_type, measure_title, state, election_date), " +
          "ballot_candidates(name, party)",
      )
      .eq("user_id", ctx.getUserId())
      .order("updated_at", { ascending: false });

    if (error) return errorResult(error.message);
    return textResult({
      count: data?.length ?? 0,
      selections: data ?? [],
      note: "Practice ballot only — unofficial, for personal use.",
    });
  },
});
