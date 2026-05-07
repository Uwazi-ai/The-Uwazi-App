import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOrgMembership() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["org-membership", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("org_members" as any)
        .select("*, partner_orgs:org_id(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });
}
