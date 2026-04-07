import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function getCacheKey(key: string): string {
  return `congress_cache_${key}`;
}

function getCached(key: string) {
  try {
    const raw = sessionStorage.getItem(getCacheKey(key));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > 5 * 60 * 1000) {
      sessionStorage.removeItem(getCacheKey(key));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(key: string, data: unknown) {
  try {
    sessionStorage.setItem(getCacheKey(key), JSON.stringify({ data, ts: Date.now() }));
  } catch { /* storage full */ }
}

async function fetchCongress(path: string, params: Record<string, string> = {}) {
  const cacheKey = `${path}_${JSON.stringify(params)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke("congress-proxy", {
    body: { path, params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === 'object' ? JSON.stringify(data.error) : data.error);

  setCache(cacheKey, data);
  return data;
}

export function useRecentBills(congress = "119", limit = 20) {
  return useQuery({
    queryKey: ["congress", "recent", congress, limit],
    queryFn: () => fetchCongress("/bill", {
      congress,
      sort: "updateDate+desc",
      limit: String(limit),
    }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useBillSearchCongress(query: string, congress = "119", limit = 20) {
  return useQuery({
    queryKey: ["congress", "search", query, congress],
    queryFn: () => fetchCongress("/bill", {
      congress,
      query,
      limit: String(limit),
    }),
    enabled: !!query,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useBillDetailCongress(congress: string, type: string, number: string) {
  return useQuery({
    queryKey: ["congress", "bill", congress, type, number],
    queryFn: () => fetchCongress(`/bill/${congress}/${type.toLowerCase()}/${number}`),
    enabled: !!congress && !!type && !!number,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useBillSummaries(congress: string, type: string, number: string) {
  return useQuery({
    queryKey: ["congress", "summaries", congress, type, number],
    queryFn: () => fetchCongress(`/bill/${congress}/${type.toLowerCase()}/${number}/summaries`),
    enabled: !!congress && !!type && !!number,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function hasCongressApiKey() {
  return true; // API key is now server-side
}

export function detectCategory(title: string): string | null {
  const t = title.toLowerCase();
  if (/health|medic|hospital|pharma|drug/.test(t)) return "Health";
  if (/hous(e|ing)|rent|mortgage|shelter/.test(t)) return "Housing";
  if (/educ|school|student|college|universit/.test(t)) return "Education";
  if (/crim|justice|police|prison|incarcerat/.test(t)) return "Criminal Justice";
  if (/tax|budget|appropriat|fiscal/.test(t)) return "Finance";
  if (/environment|climate|energy|emission/.test(t)) return "Environment";
  if (/immigra|border|visa|asylum/.test(t)) return "Immigration";
  return null;
}

export function formatBillType(type: string): string {
  const map: Record<string, string> = {
    hr: "H.R.", s: "S.", hjres: "H.J.Res.", sjres: "S.J.Res.",
    hconres: "H.Con.Res.", sconres: "S.Con.Res.", hres: "H.Res.", sres: "S.Res.",
  };
  return map[type.toLowerCase()] || type.toUpperCase();
}
