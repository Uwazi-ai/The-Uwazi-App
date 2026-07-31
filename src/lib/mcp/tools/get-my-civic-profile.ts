import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "get_my_civic_profile",
  title: "Get my civic profile",
  description:
    "Get the signed-in UWAZI user's civic profile: city/state, ZIP, resolved districts, county election authority, and civic XP/streak stats.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "display_name, city, state_code, zip_code, county_name, district, " +
          "us_congressional_district, mo_house_district, mo_senate_district, " +
          "city_council_district, school_district, election_authority_key, " +
          "party_preference, onboarding_complete, registration_verified_at",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return errorResult(error.message);
    if (!profile) return errorResult("No profile found for this user.");

    const { data: stats } = await supabase
      .from("user_civic_stats")
      .select("civic_xp, current_streak, longest_streak, bills_tracked_count")
      .eq("user_id", userId)
      .maybeSingle();

    return textResult({ profile, stats: stats ?? null });
  },
});
