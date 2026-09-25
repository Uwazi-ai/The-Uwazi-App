import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import kceb from "@/data/kceb-nov-2026.json";

export interface PrecinctInfo {
  ward: number;
  precinct: number;
  placeName: string;
  address: string;
  room: string;
  rep: number;
  leg: number;
}

/** Parse "6-14", "6/14", "Ward 6 precinct 14" into [ward, precinct]. */
export function parsePrecinct(raw: string | null | undefined): [number, number] | null {
  if (!raw) return null;
  const nums = String(raw).match(/\d+/g);
  if (!nums || nums.length < 2) return null;
  return [parseInt(nums[0], 10), parseInt(nums[1], 10)];
}

/** Look up a Kansas City (KCEB) ward/precinct in the Sept 15, 2026 poll log. */
export function lookupPrecinct(raw: string | null | undefined): PrecinctInfo | null {
  const wp = parsePrecinct(raw);
  if (!wp) return null;
  const [ward, precinct] = wp;
  const w = (kceb as any).polling.wards[String(ward)];
  if (!w) return null;
  for (const place of w.places) {
    for (const g of place.precincts) {
      if (g.pcts.includes(precinct)) {
        return { ward, precinct, placeName: place.name, address: place.address, room: place.room, rep: g.rep, leg: g.leg };
      }
    }
  }
  return null;
}

/** Keep only contests on this voter's ballot based on district (general election data). */
export function filterByDistrict(contests: BallotContest[], precinctRaw: string | null | undefined): BallotContest[] {
  const info = lookupPrecinct(precinctRaw);
  return contests.filter((c) => {
    switch (c.district_type) {
      case "mo_house":
        return !!info && String(info.rep) === c.district_id;
      case "jackson_leg":
        return !!info && String(info.leg) === c.district_id;
      default:
        return true;
    }
  });
}

export const ELECTION_DATE = "2026-11-03";
export const ELECTION_LABEL = "Tuesday, November 3, 2026";

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
  district_type?: string | null;
  district_id?: string | null;
  fiscal_note?: string | null;
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
    // General-election contests are tagged by district: everyone sees them regardless of party.
    if (c.district_type) return true;
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
          "user_id, full_address, address_line1, city, state_code, zip_code, county_name, election_authority_key, party_preference, registration_verified_at, precinct_id",
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
  const { data: profile } = useVoterProfile();
  const precinct = (profile as any)?.precinct_id ?? null;
  return useQuery({
    queryKey: ["my-ballot-contests", state, ELECTION_DATE, precinct],
    queryFn: async () => {
      if (!state) return [] as BallotContest[];
      const { data } = await supabase
        .from("ballot_contests")
        .select("*")
        .eq("state", state)
        .eq("election_date", ELECTION_DATE)
        .order("sort_order", { ascending: true });
      return filterByDistrict((data || []) as BallotContest[], precinct);
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

export function useSavePrecinct() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (precinct: string | null) => {
      if (!user) throw new Error("Must be signed in");
      const { error } = await supabase.from("profiles").update({ precinct_id: precinct }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ballot-profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["my-ballot-contests"] });
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
