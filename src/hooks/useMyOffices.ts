import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

export type MyOffice = {
  id: string;
  office_title: string;
  current_holder: string | null;
  term_end: string | null;
  jurisdiction_level: string | null;
  district_type: string | null;
  district_code: string | null;
  source_url: string | null;
  last_verified_at: string | null;
  match_level: "city" | "district" | "county" | "school";
};

export type UserDistricts = {
  resolved: Record<string, string>;
  precision: "address" | "zip";
  resolved_at: string;
} | null;

/** The offices that match where this person lives. City wide plus their own districts. */
export function useMyOffices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-offices", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_my_offices");
      if (error) throw error;
      return (data ?? []) as MyOffice[];
    },
  });
}

/** The district codes we resolved for this person. We never store their street address here. */
export function useMyDistricts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-districts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await db.from("user_districts").select("resolved, precision, resolved_at").eq("user_id", user!.id).maybeSingle();
      return (data ?? null) as UserDistricts;
    },
  });
}

export const ADD_ADDRESS_LINE = "Add your street address to see your exact district.";

const GROUPS = [
  { key: "city", label: "Your city" },
  { key: "county", label: "Your county" },
  { key: "school", label: "Your school district" },
] as const;

/** Splits offices into city, county, and school district groups, keeping their order. Empty groups are left out. */
export function groupOffices<T extends { jurisdiction_level?: string | null; match_level?: string | null }>(items: T[]) {
  const keyOf = (o: T) => {
    const l = o.match_level === "county" || o.jurisdiction_level === "county" ? "county"
      : o.match_level === "school" || o.jurisdiction_level === "school" ? "school" : "city";
    return l;
  };
  return GROUPS.map((g) => ({ ...g, items: items.filter((o) => keyOf(o) === g.key) })).filter((g) => g.items.length);
}
