import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_elections",
  title: "List elections",
  description:
    "List upcoming or recent elections tracked by UWAZI, with registration deadlines, early-voting windows, and absentee deadlines.",
  inputSchema: {
    jurisdiction: z
      .string()
      .optional()
      .describe("Filter by jurisdiction name, e.g. Missouri or Kansas."),
    from_date: z
      .string()
      .optional()
      .describe("ISO date; only elections on or after this date. Defaults to today."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ jurisdiction, from_date }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("elections")
      .select(
        "id, jurisdiction, election_date, type, description, registration_deadline, " +
          "early_voting_start, early_voting_end, absentee_deadline",
      )
      .gte("election_date", from_date ?? new Date().toISOString().slice(0, 10))
      .order("election_date")
      .limit(25);

    if (jurisdiction) query = query.ilike("jurisdiction", `%${jurisdiction}%`);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ count: data?.length ?? 0, elections: data ?? [] });
  },
});
