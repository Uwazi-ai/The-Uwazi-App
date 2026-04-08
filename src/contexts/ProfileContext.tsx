import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileContextType {
  displayName: string;
  avatarUrl: string | null;
  zipCode: string | null;
  fullAddress: string | null;
  city: string | null;
  stateCode: string | null;
  isAdmin: boolean;
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
  const [profileLoaded, setProfileLoaded] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, zip_code, is_admin, full_address, city, state_code")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setDisplayName(data.display_name || user.email?.split("@")[0] || "User");
      setAvatarUrl(data.avatar_url);
      setZipCode(data.zip_code);
      setFullAddress((data as any).full_address ?? null);
      setCity((data as any).city ?? null);
      setStateCode((data as any).state_code ?? null);
      setIsAdmin(data.is_admin ?? false);
    }
    setProfileLoaded(true);
  }, [user]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ displayName, avatarUrl, zipCode, fullAddress, city, stateCode, isAdmin, profileLoaded, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}
