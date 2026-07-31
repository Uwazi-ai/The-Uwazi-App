import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "search_lessons",
  title: "Search civic lessons",
  description:
    "Search UWAZI's published civic-education lessons by keyword or track. Returns titles, tracks, difficulty, XP, and key takeaways.",
  inputSchema: {
    query: z.string().optional().describe("Keyword to match in lesson title or description."),
    track: z.string().optional().describe("Track name, e.g. Voting Basics."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, track }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);

    let q = supabase
      .from("lessons")
      .select(
        "id, slug, title, description, track_name, category, difficulty, xp_reward, " +
          "estimated_minutes, key_takeaways, lesson_number",
      )
      .eq("is_published", true)
      .order("order_index")
      .limit(25);

    if (query) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    if (track) q = q.ilike("track_name", `%${track}%`);

    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return textResult({ count: data?.length ?? 0, lessons: data ?? [] });
  },
});
