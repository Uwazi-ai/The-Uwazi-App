import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchVoterElections, getVoterElectionsFromProfile } from "@/services/voterElections";
import { useQueryClient } from "@tanstack/react-query";

const SESSION_KEY = "uwazi_election_refresh_done";

/**
 * Silent background refresh of election data.
 * Runs once per app session if cached data is older than 24h.
 */
export function useElectionDataRefresh() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const run = async () => {
      try {
        const { data: profile } = await (supabase.from("profiles") as any)
          .select("voter_address_street, voter_address_city, voter_address_state, voter_address_zip, voter_elections_data, voter_elections_cached_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile) return;

        const { hasAddress, isFresh } = getVoterElectionsFromProfile(profile);
        if (!hasAddress || isFresh) return;

        sessionStorage.setItem(SESSION_KEY, "1");

        await fetchVoterElections({
          street: profile.voter_address_street,
          city: profile.voter_address_city,
          state: profile.voter_address_state,
          zip: profile.voter_address_zip,
        });

        // Invalidate queries so UI picks up fresh data
        queryClient.invalidateQueries({ queryKey: ["voter-profile"] });
      } catch {
        // Silently fail — keep showing cached data
      }
    };

    run();
  }, [user, queryClient]);
}
