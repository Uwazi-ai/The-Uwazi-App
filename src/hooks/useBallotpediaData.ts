import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBallotpediaData(stateCode?: string, city?: string) {
  const year = new Date().getFullYear();

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ["bp-candidates", stateCode, year],
    queryFn: async () => {
      const { data } = await supabase
        .from("ballotpedia_candidates")
        .select("*")
        .eq("state_code", stateCode!)
        .eq("election_year", year)
        .order("office", { ascending: true });
      return data || [];
    },
    enabled: !!stateCode,
    staleTime: 1000 * 60 * 30,
  });

  const { data: measures = [], isLoading: measuresLoading } = useQuery({
    queryKey: ["bp-measures", stateCode, year],
    queryFn: async () => {
      const { data } = await supabase
        .from("ballotpedia_ballot_measures")
        .select("*")
        .eq("state_code", stateCode!)
        .eq("election_year", year);
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

  const loading = candidatesLoading || measuresLoading || officialsLoading || electionsLoading;

  return { candidates, measures, officials, elections, loading };
}
