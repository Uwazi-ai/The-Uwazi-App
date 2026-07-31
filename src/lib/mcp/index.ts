import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyCivicProfile from "./tools/get-my-civic-profile";
import listElections from "./tools/list-elections";
import getBallot from "./tools/get-ballot";
import getMyBallotSelections from "./tools/get-my-ballot-selections";
import findElectionAuthority from "./tools/find-election-authority";
import searchLessons from "./tools/search-lessons";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "the-uwazi-app",
  title: "The Uwazi App",
  version: "0.1.0",
  instructions:
    "Nonpartisan civic tools for UWAZI. Use get_my_civic_profile first for anything that depends " +
    "on where the signed-in voter lives, then list_elections and get_ballot for ballot content, " +
    "get_my_ballot_selections for their saved practice ballot, find_election_authority for official " +
    "handoffs, and search_lessons for civic education. UWAZI never endorses candidates, parties, or " +
    "positions — present factual information only and refer voters to their county election authority " +
    "when verified data is unavailable.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyCivicProfile,
    listElections,
    getBallot,
    getMyBallotSelections,
    findElectionAuthority,
    searchLessons,
  ],
});
