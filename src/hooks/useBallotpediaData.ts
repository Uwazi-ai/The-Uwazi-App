import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RaceWithCandidates {
  race_id: string;
  office: string;
  district: number | null;
  state: string;
  phase: string;
  election_date: string;
  is_partisan: boolean;
  candidates: {
    id: string;
    name: string;
    party: string;
    is_incumbent: boolean;
    ballotpedia_url: string | null;
    photo_url: string | null;
    bio: string | null;
    website_url: string | null;
  }[];
}

export function useBallotpediaData(stateCode?: string, city?: string) {
  // Fetch races + candidates from the structured election_races / race_candidates tables
  const { data: racesWithCandidates = [], isLoading: racesLoading } = useQuery({
    queryKey: ["race-candidates", stateCode],
    queryFn: async () => {
      // 1. Get all races for this state
      const { data: races } = await supabase
        .from("election_races")
        .select("*")
        .eq("state", stateCode!)
        .order("office", { ascending: true })
        .order("district", { ascending: true });

      if (!races || races.length === 0) return [];

      // 2. Get all candidates for those races
      const raceIds = races.map((r) => r.id);
      const { data: candidates } = await supabase
        .from("race_candidates")
        .select("*")
        .in("race_id", raceIds)
        .eq("status", "active")
        .order("is_incumbent", { ascending: false })
        .order("party", { ascending: true });

      // 3. Group candidates by race
      const candidatesByRace: Record<string, typeof candidates> = {};
      (candidates || []).forEach((c) => {
        if (!candidatesByRace[c.race_id]) candidatesByRace[c.race_id] = [];
        candidatesByRace[c.race_id].push(c);
      });

      // 4. Build combined result
      const result: RaceWithCandidates[] = races.map((r) => ({
        race_id: r.id,
        office: r.office,
        district: r.district,
        state: r.state,
        phase: r.phase,
        election_date: r.election_date,
        is_partisan: r.is_partisan,
        candidates: (candidatesByRace[r.id] || []).map((c) => ({
          id: c.id,
          name: c.name,
          party: c.party,
          is_incumbent: c.is_incumbent,
          ballotpedia_url: c.ballotpedia_url,
          photo_url: c.photo_url,
          bio: c.bio,
          website_url: c.website_url,
        })),
      }));

      return result;
    },
    enabled: !!stateCode,
    staleTime: 1000 * 60 * 30,
  });

  const { data: measures = [], isLoading: measuresLoading } = useQuery({
    queryKey: ["bp-measures", stateCode],
    queryFn: async () => {
      const { data } = await supabase
        .from("ballotpedia_ballot_measures")
        .select("*")
        .eq("state_code", stateCode!)
        .gte("election_year", new Date().getFullYear());
      return data || [];
    },
    enabled: !!stateCode,
    staleTime: 1000 * 60 * 30,
  });

  const { data: officials = [], isLoading: officialsLoading } = useQuery({
    queryKey: ["bp-officials", stateCode, city],
    queryFn: async () => {
      let q = supabase.from("ballotpedia_officials").select("*").eq("state_code", stateCode!);
      if (city) q = q.eq("city", city);
      const { data } = await q;
      return data || [];
    },
    enabled: !!stateCode,
    staleTime: 1000 * 60 * 30,
  });

  const { data: elections = [], isLoading: electionsLoading } = useQuery({
    queryKey: ["bp-elections", stateCode],
    queryFn: async () => {
      const { data } = await supabase
        .from("ballotpedia_elections")
        .select("*")
        .eq("state_code", stateCode!)
        .eq("is_upcoming", true)
        .order("election_date", { ascending: true });
      return data || [];
    },
    enabled: !!stateCode,
    staleTime: 1000 * 60 * 30,
  });

  const loading = racesLoading || measuresLoading || officialsLoading || electionsLoading;

  // Keep backward-compat: export candidates as empty (no longer used), add racesWithCandidates
  return { candidates: [], racesWithCandidates, measures, officials, elections, loading };
}
