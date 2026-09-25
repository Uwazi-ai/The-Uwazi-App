import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NextElection {
  id: string;
  jurisdiction: string; // "Missouri" | "Kansas"
  election_date: string; // ISO date
  type: string;
  registration_deadline: string | null;
  early_voting_start: string | null;
  early_voting_end: string | null;
  absentee_deadline: string | null;
  description: string | null;
}

const STATE_NAMES: Record<string, string> = {
  MO: "Missouri",
  KS: "Kansas",
};

export function formatElectionDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", opts ?? { month: "long", day: "numeric", year: "numeric" });
}

/**
 * Reads the next upcoming election for the voter's state from the
 * elections calendar table. Falls back to any upcoming election when
 * the state is unknown.
 */
export function useNextElection(stateCode: string | null | undefined) {
  return useQuery({
    queryKey: ["next-election", stateCode ?? "any"],
    queryFn: async (): Promise<NextElection | null> => {
      const today = new Date().toISOString().slice(0, 10);
      const jurisdiction = stateCode ? STATE_NAMES[stateCode] : null;

      let query = supabase
        .from("elections")
        .select("id, jurisdiction, election_date, type, registration_deadline, early_voting_start, early_voting_end, absentee_deadline, description")
        .gte("election_date", today)
        .order("election_date", { ascending: true })
        .limit(1);

      if (jurisdiction) query = query.eq("jurisdiction", jurisdiction);

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (data) return data as NextElection;

      // No upcoming election for this state — fall back to the next one anywhere
      if (jurisdiction) {
        const { data: anyNext } = await supabase
          .from("elections")
          .select("id, jurisdiction, election_date, type, registration_deadline, early_voting_start, early_voting_end, absentee_deadline, description")
          .gte("election_date", today)
          .order("election_date", { ascending: true })
          .limit(1)
          .maybeSingle();
        return (anyNext as NextElection) ?? null;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
