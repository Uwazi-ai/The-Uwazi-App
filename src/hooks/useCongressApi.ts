import { useQuery } from "@tanstack/react-query";

const API_KEY = import.meta.env.VITE_CONGRESS_API_KEY;
const BASE_URL = "https://api.congress.gov/v3";

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
  if (!API_KEY) throw new Error("MISSING_API_KEY");

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const cacheKey = url.toString();
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Congress API error: ${res.status}`);
  const data = await res.json();

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
    enabled: !!API_KEY,
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
    enabled: !!query && !!API_KEY,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useBillDetailCongress(congress: string, type: string, number: string) {
  return useQuery({
    queryKey: ["congress", "bill", congress, type, number],
    queryFn: () => fetchCongress(`/bill/${congress}/${type.toLowerCase()}/${number}`),
    enabled: !!congress && !!type && !!number && !!API_KEY,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useBillSummaries(congress: string, type: string, number: string) {
  return useQuery({
    queryKey: ["congress", "summaries", congress, type, number],
    queryFn: () => fetchCongress(`/bill/${congress}/${type.toLowerCase()}/${number}/summaries`),
    enabled: !!congress && !!type && !!number && !!API_KEY,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function hasCongressApiKey() {
  return !!API_KEY;
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
