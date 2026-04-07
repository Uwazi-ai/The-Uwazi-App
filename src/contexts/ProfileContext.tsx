import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileContextType {
  displayName: string;
  avatarUrl: string | null;
  zipCode: string | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  displayName: "User",
  avatarUrl: null,
  zipCode: null,
  isAdmin: false,
  refreshProfile: async () => {},
});

export const useProfile = () => useContext(ProfileContext);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, zip_code, is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setDisplayName(data.display_name || user.email?.split("@")[0] || "User");
      setAvatarUrl(data.avatar_url);
      setZipCode(data.zip_code);
      setIsAdmin(data.is_admin ?? false);
    }
  }, [user]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ displayName, avatarUrl, zipCode, isAdmin, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}
