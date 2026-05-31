import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Level = "city" | "state" | "federal";

type LevelData = {
  projects: any[];
  vendors: any[];
  flags: any[];
  total: number;
  refreshedAt: string | null;
  sources: string[];
  meta: Record<string, any>;
} | null;

function normalize(row: any): LevelData {
  if (!row) return null;
  return {
    projects: row.projects_json || [],
    vendors: row.vendors_json || [],
    flags: row.flags_json || [],
    total: Number(row.total_investment) || 0,
    refreshedAt: row.refreshed_at,
    sources: row.data_sources || [],
    meta: row.meta_json || {},
  };
}

export function useMyCityData() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [cityData, setCityData] = useState<LevelData>(null);
  const [stateData, setStateData] = useState<LevelData>(null);
  const [federalData, setFederalData] = useState<LevelData>(null);
  const [activeLevel, setActiveLevel] = useState<Level>("city");
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataFreshness, setDataFreshness] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "address, full_address, street_address, zip_code, lat, lng, districts_resolved_at, city_council_district, mo_house_district, mo_senate_district, us_congressional_district",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(profileData);

      const addressForResolve =
        (profileData as any)?.address ||
        (profileData as any)?.full_address ||
        (profileData as any)?.street_address ||
        null;

      if (!addressForResolve) {
        setError("NO_ADDRESS");
        setLoading(false);
        return;
      }

      let zip = (profileData as any)?.zip_code as string | null;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const districtsStale =
        !(profileData as any)?.districts_resolved_at ||
        Date.now() - new Date((profileData as any).districts_resolved_at).getTime() > sevenDaysMs;

      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;

      if (!zip || districtsStale) {
        setResolving(true);
        try {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-address`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ address: addressForResolve }),
            },
          );
          if (res.ok) {
            const body = await res.json();
            if (body?.zip_code) zip = body.zip_code;
          }
        } catch (e) {
          console.error("resolve-address failed:", e);
        }
        setResolving(false);
      }

      if (!zip) {
        setError("ZIP_NOT_RESOLVED");
        setLoading(false);
        return;
      }

      const { data: cacheRows } = await supabase
        .from("zip_investment_cache" as any)
        .select("*")
        .eq("zip_code", zip)
        .eq("fiscal_year", "2024");

      const cache = {
        city: (cacheRows as any[])?.find((r) => r.level === "city"),
        state: (cacheRows as any[])?.find((r) => r.level === "state"),
        federal: (cacheRows as any[])?.find((r) => r.level === "federal"),
      };

      const sevenDaysAgo = new Date(Date.now() - sevenDaysMs);
      let anyRefreshing = false;
      for (const level of ["city", "state", "federal"] as Level[]) {
        const cached = (cache as any)[level];
        const stale = !cached || new Date(cached.refreshed_at) < sevenDaysAgo;
        if (stale) {
          anyRefreshing = true;
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-investment-data`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ zip_code: zip, level }),
          }).catch((e) => console.error(`refresh ${level} failed:`, e));
        }
      }
      setRefreshing(anyRefreshing);

      setCityData(normalize(cache.city));
      setStateData(normalize(cache.state));
      setFederalData(normalize(cache.federal));

      const newest = (cacheRows as any[])
        ?.map((r) => new Date(r.refreshed_at).getTime())
        .sort((a, b) => b - a)[0];
      if (newest) setDataFreshness(new Date(newest));
    } catch (err) {
      console.error("useMyCityData error:", err);
      setError("FETCH_ERROR");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const activeData =
    activeLevel === "city" ? cityData : activeLevel === "state" ? stateData : federalData;

  return {
    profile,
    activeData,
    cityData,
    stateData,
    federalData,
    activeLevel,
    setActiveLevel,
    loading,
    resolving,
    refreshing,
    error,
    dataFreshness,
    refetch: loadData,
    zip: (profile as any)?.zip_code ?? null,
    address:
      (profile as any)?.address ??
      (profile as any)?.full_address ??
      (profile as any)?.street_address ??
      null,
    districts: {
      cityCouncil: (profile as any)?.city_council_district ?? null,
      moHouse: (profile as any)?.mo_house_district ?? null,
      moSenate: (profile as any)?.mo_senate_district ?? null,
      usCongress: (profile as any)?.us_congressional_district ?? null,
    },
  };
}
