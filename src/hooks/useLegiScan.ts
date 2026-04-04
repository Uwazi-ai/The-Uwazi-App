import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function callLegiScan(op: string, params: Record<string, string> = {}) {
  const { data, error } = await supabase.functions.invoke("legiscan", {
    body: { op, params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useBillSearch(state: string, query: string) {
  return useQuery({
    queryKey: ["legiscan", "search", state, query],
    queryFn: () =>
      callLegiScan("search", {
        query,
        state,
      }),
    enabled: !!query && !!state,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}

export function useBillDetail(billId: string) {
  return useQuery({
    queryKey: ["legiscan", "getBill", billId],
    queryFn: () => callLegiScan("getBill", { id: billId }),
    enabled: !!billId,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
}

export function useStateSessions(state: string) {
  return useQuery({
    queryKey: ["legiscan", "getSessionList", state],
    queryFn: () => callLegiScan("getSessionList", { state }),
    enabled: !!state,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
}
