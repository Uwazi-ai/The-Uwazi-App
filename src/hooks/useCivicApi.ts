import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const zipOnlyAddressPattern = /^\d{5}(?:-\d{4})?(?:\s+USA)?$/i;

function normalizeVoterAddress(address?: string) {
  const trimmed = address?.trim() ?? "";
  return zipOnlyAddressPattern.test(trimmed) ? "" : trimmed;
}

function emptyVoterInfoResponse(status: "no_election" | "invalid_address", message?: string) {
  return {
    status,
    message,
    pollingLocations: [],
    contests: [],
    earlyVoteSites: [],
    dropOffLocations: [],
  };
}

async function callGoogleCivic(endpoint: string, params: Record<string, string> = {}) {
  const { data, error } = await supabase.functions.invoke("google-civic", {
    body: { endpoint, params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) {
    const msg = typeof data.error === 'object' ? data.error.message || JSON.stringify(data.error) : data.error;
    throw new Error(msg);
  }
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
  const normalizedAddress = normalizeVoterAddress(address);

  return useQuery({
    queryKey: ["voterInfo", normalizedAddress, electionId],
    queryFn: async () => {
      try {
        return await callGoogleCivic("/voterinfo", {
          address: normalizedAddress,
          ...(electionId ? { electionId } : {}),
        });
      } catch (e: any) {
        const message = String(e?.message ?? "");
        // "Election unknown" means no active election for this address — return empty data
        if (message.includes("Election unknown") || message.includes("election unknown")) {
          return emptyVoterInfoResponse("no_election", message);
        }
        if (message.includes("Failed to parse address") || message.includes("failed to parse address")) {
          return emptyVoterInfoResponse("invalid_address", "Please add a full street address to load your polling place and ballot.");
        }
        throw e;
      }
    },
    enabled: !!normalizedAddress,
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
