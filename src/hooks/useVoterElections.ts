import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VoterElection {
  id: string;
  name: string;
  date: string;
  electionDay: string;
  status: "active" | "expected";
  registrationDeadlines?: {
    online?: string | null;
    byMail?: string | null;
    inPerson?: string | null;
  };
  votingMethods?: {
    byMail?: boolean;
    earlyVoting?: { start?: string; end?: string } | null;
    inPerson?: boolean;
  };
  checkRegistrationUrl?: string;
  registrationUrl?: string;
  pollingLocationUrl?: string;
  contests?: VoterContest[];
  ballotMeasures?: BallotMeasure[];
}

export interface VoterContest {
  id?: string;
  name: string;
  level?: "federal" | "state" | "local";
  candidates?: {
    name: string;
    party?: string;
    incumbent?: boolean;
  }[];
}

export interface BallotMeasure {
  id?: string;
  name: string;
  summary?: string;
}

export interface VoterElectionsData {
  elections: VoterElection[];
  source?: string;
  state?: string;
  zip?: string;
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useVoterElections() {
  const { user } = useAuth();

  return useQuery<VoterElectionsData | null>({
    queryKey: ["voter-elections", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: profile } = await (supabase.from("profiles") as any)
        .select("voter_elections_data, voter_elections_cached_at, address_line1, city, state_code, zip_code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) return null;

      // Check if cached data is still fresh
      if (profile.voter_elections_data && profile.voter_elections_cached_at) {
        const cachedAt = new Date(profile.voter_elections_cached_at).getTime();
        if (Date.now() - cachedAt < CACHE_DURATION_MS) {
          return profile.voter_elections_data as VoterElectionsData;
        }
      }

      // If we have address fields but stale/missing cache, refresh in background
      if (profile.address_line1 && profile.city && profile.state_code && profile.zip_code) {
        try {
          const { data, error } = await supabase.functions.invoke("get-voter-elections", {
            body: {
              street: profile.address_line1,
              city: profile.city,
              state: profile.state_code,
              zip: profile.zip_code,
            },
          });
          if (!error && data) return data as VoterElectionsData;
        } catch {
          // Fall through to cached data if available
        }
        if (profile.voter_elections_data) {
          return profile.voter_elections_data as VoterElectionsData;
        }
      }

      return null;
    },
    enabled: !!user,
    staleTime: CACHE_DURATION_MS,
  });
}

export function useFetchVoterElections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "get-voter-elections",
        { body: address }
      );
      if (error) throw new Error(error.message);
      return data as VoterElectionsData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voter-elections"] });
    },
  });
}
