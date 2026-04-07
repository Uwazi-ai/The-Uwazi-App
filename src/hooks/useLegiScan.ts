import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ZIP prefix → 2-letter state code
const zipToStateMap: Record<string, string> = {
  "64": "MO", "65": "MO",
  "66": "KS", "67": "KS",
  "60": "IL", "61": "IL", "62": "IL",
  "43": "OH", "44": "OH", "45": "OH",
  "75": "TX", "76": "TX", "77": "TX", "78": "TX", "79": "TX",
  "90": "CA", "91": "CA", "92": "CA", "93": "CA", "94": "CA", "95": "CA", "96": "CA",
  "10": "NY", "11": "NY", "12": "NY", "13": "NY", "14": "NY",
  "30": "GA", "31": "GA",
  "33": "FL", "34": "FL",
  "20": "DC", "21": "MD",
  "98": "WA", "99": "WA",
  "48": "MI", "49": "MI",
  "80": "CO", "81": "CO",
  "37": "NC", "27": "NC", "28": "NC",
  "15": "PA", "16": "PA", "17": "PA", "18": "PA", "19": "PA",
};

export function zipToState(zip: string | null): string {
  if (!zip || zip.length < 2) return "MO";
  return zipToStateMap[zip.substring(0, 2)] || "MO";
}

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

async function callLegiScan(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("legiscan-proxy", {
    body,
  });
  if (error) throw new Error(error.message);
  if (data?.status === "ERROR") throw new Error(data?.alert?.message || "LegiScan error");
  return data;
}

export function useLegiScanSearch(state: string, query: string) {
  return useQuery({
    queryKey: ["legiscan", "search", state, query],
    queryFn: async () => {
      const raw = await callLegiScan({ op: "search", state, query });
      // LegiScan search returns { searchresult: { 0: {...}, 1: {...}, summary: {...} } }
      const sr = raw?.searchresult || {};
      const bills: any[] = [];
      for (const key of Object.keys(sr)) {
        if (key === "summary") continue;
        const item = sr[key];
        if (item && item.bill_id) bills.push(item);
      }
      return { bills, summary: sr.summary };
    },
    enabled: !!state,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}

export function useLegiScanBill(billId: string | number | null) {
  return useQuery({
    queryKey: ["legiscan", "getBill", billId],
    queryFn: async () => {
      const raw = await callLegiScan({ op: "getBill", bill_id: String(billId) });
      return raw?.bill || raw;
    },
    enabled: !!billId,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
}

export function useLegiScanMasterList(state: string) {
  return useQuery({
    queryKey: ["legiscan", "masterList", state],
    queryFn: async () => {
      const raw = await callLegiScan({ op: "getMasterList", state });
      const ml = raw?.masterlist || {};
      const session = ml.session;
      const bills: any[] = [];
      for (const key of Object.keys(ml)) {
        if (key === "session") continue;
        const item = ml[key];
        if (item && item.bill_id) bills.push(item);
      }
      // Sort by last_action_date desc
      bills.sort((a, b) => (b.last_action_date || "").localeCompare(a.last_action_date || ""));
      return { bills, session };
    },
    enabled: !!state,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}
