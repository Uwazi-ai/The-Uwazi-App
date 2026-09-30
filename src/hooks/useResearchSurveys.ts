import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type QType = "single_choice" | "multi_choice" | "scale" | "short_text";
export interface SurveyQuestion { id: string; prompt: string; type: QType; options?: string[] }
export interface ResearchSurvey { id: string; title: string; intro: string | null; questions: SurveyQuestion[]; ends_at: string | null }

export const Q_TYPE_LABEL: Record<QType, string> = {
  single_choice: "Pick one", multi_choice: "Pick any", scale: "Scale 1 to 5", short_text: "Short answer",
};

/** Research surveys sent to the signed-in person that are still open and not answered. */
export function useMyResearchSurveys() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-research-surveys", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ResearchSurvey[]> => {
      const { data, error } = await (supabase as any).rpc("get_my_research_surveys");
      if (error) throw error;
      return data ?? [];
    },
  });
}
