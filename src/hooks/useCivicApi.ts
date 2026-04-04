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
    queryFn: () =>
      callGoogleCivic("/voterinfo", {
        address,
        ...(electionId ? { electionId } : {}),
      }),
    enabled: !!address,
    staleTime: 1000 * 60 * 30, // 30 min
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
