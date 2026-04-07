import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function callGoogleCivic(endpoint: string, params: Record<string, string> = {}) {
  const { data, error } = await supabase.functions.invoke("google-civic", {
    body: { endpoint, params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useElections() {
  return useQuery({
    queryKey: ["elections"],
    queryFn: () => callGoogleCivic("/elections"),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
}

export function useVoterInfo(address: string, electionId?: string) {
  return useQuery({
    queryKey: ["voterInfo", address, electionId],
    queryFn: async () => {
      try {
        return await callGoogleCivic("/voterinfo", {
          address,
          ...(electionId ? { electionId } : {}),
        });
      } catch (e: any) {
        // "Election unknown" means no active election for this address — return empty data
        if (e?.message?.includes("Election unknown") || e?.message?.includes("election unknown")) {
          return { pollingLocations: [], contests: [], earlyVoteSites: [], dropOffLocations: [] };
        }
        throw e;
      }
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
}

export function useRepresentatives(address: string) {
  return useQuery({
    queryKey: ["representatives", address],
    queryFn: () => callGoogleCivic("/representatives", { address }),
    enabled: !!address,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
}
