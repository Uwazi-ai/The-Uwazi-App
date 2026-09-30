import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

export type PlanSteps = {
  registered?: boolean;
  polling?: boolean;
  ballot?: boolean;
  when?: boolean;
  opened?: string[];
};

export const PLAN_KEYS: Array<keyof PlanSteps> = ["registered", "polling", "ballot", "when"];

export function planDoneCount(steps: PlanSteps) {
  return PLAN_KEYS.filter((k) => steps[k] === true).length;
}

/** Reads and saves this person's plan to vote for one election. */
export function useVotingPlan(electionId: string | null | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["voting-plan", user?.id, electionId],
    enabled: !!user?.id && !!electionId,
    queryFn: async (): Promise<PlanSteps> => {
      const { data } = await db
        .from("voting_plan")
        .select("steps")
        .eq("user_id", user!.id)
        .eq("election_id", electionId)
        .maybeSingle();
      return (data?.steps ?? {}) as PlanSteps;
    },
  });

  const save = useMutation({
    mutationFn: async (steps: PlanSteps) => {
      const { data, error } = await db.rpc("save_voting_plan", {
        _election_id: electionId,
        _steps: steps,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        steps: (row?.steps ?? steps) as PlanSteps,
        points: Number(row?.points_awarded ?? 0),
      };
    },
    onSuccess: (res) => {
      qc.setQueryData(["voting-plan", user?.id, electionId], res.steps);
      qc.invalidateQueries({ queryKey: ["journey"] });
    },
  });

  return { steps: query.data ?? {}, isLoading: query.isLoading, save };
}
