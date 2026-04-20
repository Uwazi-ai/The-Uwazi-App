import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "super_admin" | "program_admin" | "user";

interface ProfileContextType {
  displayName: string;
  avatarUrl: string | null;
  zipCode: string | null;
  fullAddress: string | null;
  city: string | null;
  stateCode: string | null;
  isAdmin: boolean; // super admin (legacy + role-based)
  isProgramAdmin: boolean; // program_admin OR super_admin
  roles: AppRole[];
  profileLoaded: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  displayName: "User",
  avatarUrl: null,
  zipCode: null,
  fullAddress: null,
  city: null,
  stateCode: null,
  isAdmin: false,
  isProgramAdmin: false,
  roles: [],
  profileLoaded: false,
  refreshProfile: async () => {},
});

export const useProfile = () => useContext(ProfileContext);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState<string | null>(null);
  const [fullAddress, setFullAddress] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const [{ data }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, avatar_url, zip_code, is_admin, full_address, city, state_code")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("user_roles" as any).select("role").eq("user_id", user.id),
    ]);
    const userRoles: AppRole[] = (roleRows as any[] | null)?.map(r => r.role) ?? [];
    if (data) {
      setDisplayName(data.display_name || user.email?.split("@")[0] || "User");
      setAvatarUrl(data.avatar_url);
      setZipCode(data.zip_code);
      setFullAddress((data as any).full_address ?? null);
      setCity((data as any).city ?? null);
      setStateCode((data as any).state_code ?? null);
      setIsAdmin((data.is_admin ?? false) || userRoles.includes("super_admin"));
    }
    setRoles(userRoles);
    setProfileLoaded(true);
  }, [user]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Realtime: refresh profile when this user's roles or profile change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` },
        () => refreshProfile()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => refreshProfile()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshProfile]);

  const isProgramAdmin = isAdmin || roles.includes("program_admin");

  return (
    <ProfileContext.Provider value={{ displayName, avatarUrl, zipCode, fullAddress, city, stateCode, isAdmin, isProgramAdmin, roles, profileLoaded, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}
