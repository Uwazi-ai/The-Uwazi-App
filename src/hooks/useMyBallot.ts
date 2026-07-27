import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const ELECTION_DATE = "2026-08-04";
export const ELECTION_LABEL = "Tuesday, August 4, 2026";

export type PartyKey =
  | "democratic"
  | "republican"
  | "libertarian"
  | "green"
  | "constitution"
  | "unaffiliated"
  | "not_sure";

export interface BallotContest {
  id: string;
  state: string;
  contest_type: "ballot_measure" | "candidate_race" | string;
  sort_order: number;
  measure_title: string;
  measure_summary: string | null;
  plain_summary: string | null;
  yes_means: string | null;
  no_means: string | null;
  measure_full_text_url: string | null;
  source_name: string | null;
  source_url: string | null;
}

export interface BallotCandidate {
  id: string;
  contest_id: string;
  name: string;
  party: string | null;
  is_incumbent: boolean | null;
  bio: string | null;
  website: string | null;
  sort_order: number;
}

export interface BallotSelection {
  id: string;
  contest_id: string;
  candidate_id: string | null;
  measure_vote: "yes" | "no" | "undecided" | null;
  party_snapshot: string | null;
}

/** Determine which party a candidate_race belongs to from its title. */
export function contestParty(title: string): PartyKey | null {
  const t = title.toLowerCase();
  if (t.includes("democratic")) return "democratic";
  if (t.includes("republican")) return "republican";
  if (t.includes("libertarian")) return "libertarian";
  if (t.includes("green party") || t.includes("— green")) return "green";
  if (t.includes("constitution")) return "constitution";
  return null;
}

/** Return contests filtered to what should appear on the user's chosen party ballot. */
export function filterContestsForParty(
  contests: BallotContest[],
  party: PartyKey | null,
): BallotContest[] {
  return contests.filter((c) => {
    if (c.contest_type === "ballot_measure") return true;
    if (!party) return false;
    if (party === "unaffiliated" || party === "not_sure") return false;
    const cp = contestParty(c.measure_title);
    return cp === party;
  });
}

export function useVoterProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-ballot-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select(
          "user_id, full_address, address_line1, city, state_code, zip_code, county_name, election_authority_key, party_preference, registration_verified_at",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
}

export function useElectionAuthority(profile: any) {
  return useQuery({
    queryKey: ["my-ballot-authority", profile?.election_authority_key, profile?.state_code, profile?.city],
    queryFn: async () => {
      const state = profile?.state_code;
      if (!state) return null;
      if (profile?.election_authority_key) {
        const { data } = await supabase
          .from("election_authorities")
          .select("*")
          .eq("key", profile.election_authority_key)
          .maybeSingle();
        if (data) return data;
      }
      const city = (profile?.city || "").toLowerCase();
      let key: string | null = null;
      if (state === "MO" && city.includes("kansas city")) key = "mo-kcmo-eb";
      else if (state === "MO") key = "mo-jackson-eb";
      else if (state === "KS") key = "ks-johnson-eo";
      if (!key) key = state === "MO" ? "mo-sos-fallback" : "ks-sos-fallback";
      const { data } = await supabase
        .from("election_authorities")
        .select("*")
        .eq("key", key)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.state_code,
  });
}

export function useBallotContestsForState(state: string | null | undefined) {
  return useQuery({
    queryKey: ["my-ballot-contests", state, ELECTION_DATE],
    queryFn: async () => {
      if (!state) return [] as BallotContest[];
      const { data } = await supabase
        .from("ballot_contests")
        .select("*")
        .eq("state", state)
        .eq("election_date", ELECTION_DATE)
        .order("sort_order", { ascending: true });
      return (data || []) as BallotContest[];
    },
    enabled: !!state,
  });
}

export function useBallotCandidates(contestIds: string[]) {
  return useQuery({
    queryKey: ["my-ballot-candidates", contestIds.sort().join(",")],
    queryFn: async () => {
      if (!contestIds.length) return [] as BallotCandidate[];
      const { data } = await supabase
        .from("ballot_candidates")
        .select("*")
        .in("contest_id", contestIds)
        .order("sort_order", { ascending: true });
      return (data || []) as BallotCandidate[];
    },
    enabled: contestIds.length > 0,
  });
}

export function useMyBallotSelections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-ballot-selections", user?.id],
    queryFn: async () => {
      if (!user) return [] as BallotSelection[];
      const { data } = await supabase
        .from("user_ballot_selections")
        .select("id, contest_id, candidate_id, measure_vote, party_snapshot")
        .eq("user_id", user.id);
      return (data || []) as BallotSelection[];
    },
    enabled: !!user,
  });
}

export function useSaveSelection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      contest_id: string;
      candidate_id?: string | null;
      measure_vote?: "yes" | "no" | "undecided" | null;
      party_snapshot?: string | null;
    }) => {
      if (!user) throw new Error("Must be signed in");
      const payload: any = {
        user_id: user.id,
        contest_id: args.contest_id,
        candidate_id: args.candidate_id ?? null,
        measure_vote: args.measure_vote ?? null,
        party_snapshot: args.party_snapshot ?? null,
      };
      const { error } = await supabase
        .from("user_ballot_selections")
        .upsert(payload, { onConflict: "user_id,contest_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ballot-selections", user?.id] });
    },
  });
}

export function useSaveParty() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (party: PartyKey) => {
      if (!user) throw new Error("Must be signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ party_preference: party })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ballot-profile", user?.id] });
    },
  });
}

const CACHE_KEY = "uwazi.myballot.exportCache.v1";

export function saveExportCache(payload: any) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), payload }),
    );
  } catch {}
}

export function readExportCache(): { savedAt: string; payload: any } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAddressComplete(p: any) {
  return !!(p?.address_line1 && p?.city && p?.state_code && p?.zip_code);
}

export const SUPPORTED_STATES = ["MO", "KS"];

export const PARTY_LABEL: Record<PartyKey, string> = {
  democratic: "Democratic",
  republican: "Republican",
  libertarian: "Libertarian",
  green: "Green",
  constitution: "Constitution",
  unaffiliated: "Unaffiliated",
  not_sure: "Not sure",
};
