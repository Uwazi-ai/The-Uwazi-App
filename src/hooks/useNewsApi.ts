import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function cacheKey(key: string) { return `news_cache_${btoa(key).substring(0, 60)}`; }

function getCached(key: string) {
  try {
    const raw = sessionStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > 15 * 60 * 1000) { sessionStorage.removeItem(cacheKey(key)); return null; }
    return data;
  } catch { return null; }
}

function setCache(key: string, data: unknown) {
  try { sessionStorage.setItem(cacheKey(key), JSON.stringify({ data, ts: Date.now() })); } catch {}
}

async function fetchNews(params: Record<string, string>) {
  const ck = JSON.stringify(params);
  const cached = getCached(ck);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke("news-proxy", {
    body: { endpoint: "/everything", params },
  });
  if (error) throw new Error(error.message);
  if (data?.status === "error") throw new Error(data.message || "NewsAPI error");
  if (data?.error) throw new Error(typeof data.error === 'object' ? JSON.stringify(data.error) : data.error);

  setCache(ck, data);
  return data;
}

const filterQueries: Record<string, string> = {
  All: '(election OR legislation OR voting OR "civic engagement" OR "local government" OR "ballot measure")',
  Elections: 'election OR "election 2025" OR "election 2026"',
  Legislation: 'legislation OR "congress bill" OR "senate vote"',
  "Local Gov": '"local government" OR "city council" OR "mayor"',
  "Voting Rights": '"voting rights" OR "voter registration" OR "polling"',
  Policy: '"public policy" OR "government policy"',
};

export function useCivicNews(filter: string, page = 1, sortBy = "publishedAt") {
  const q = filterQueries[filter] || filterQueries.All;
  return useQuery({
    queryKey: ["news", filter, page, sortBy],
    queryFn: () => fetchNews({ q, sortBy, pageSize: "20", page: String(page) }),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}

export function useLocalNews(region: string | null) {
  return useQuery({
    queryKey: ["news", "local", region],
    queryFn: () => fetchNews({
      q: `(election OR government OR voting) AND (${region})`,
      sortBy: "publishedAt",
      pageSize: "5",
    }),
    enabled: !!region,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}

export function hasNewsApiKey() { return true; } // API key is now server-side

const zipRegions: Record<string, string> = {
  "64": "Kansas City OR Missouri",
  "66": "Kansas OR Kansas City",
  "90": "Los Angeles OR California",
  "91": "Los Angeles OR California",
  "10": "New York City OR New York",
  "11": "New York City OR New York",
  "60": "Chicago OR Illinois",
  "77": "Houston OR Texas",
  "30": "Atlanta OR Georgia",
  "20": "Washington DC",
  "33": "Miami OR Florida",
  "98": "Seattle OR Washington",
  "94": "San Francisco OR California",
  "48": "Detroit OR Michigan",
};

export function zipToRegion(zip: string | null): string | null {
  if (!zip || zip.length < 3) return null;
  return zipRegions[zip.substring(0, 2)] || null;
}
