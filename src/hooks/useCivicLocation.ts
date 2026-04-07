import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CivicLocation {
  zipCode: string | null;
  streetAddress: string | null;
  loading: boolean;
}

export function useCivicLocation(): CivicLocation {
  const { user } = useAuth();
  const [location, setLocation] = useState<CivicLocation>({
    zipCode: null,
    streetAddress: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setLocation({ zipCode: null, streetAddress: null, loading: false });
      return;
    }

    supabase
      .from("profiles")
      .select("zip_code, street_address")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setLocation({
          zipCode: data?.zip_code ?? null,
          streetAddress: data?.street_address ?? null,
          loading: false,
        });
      });
  }, [user]);

  return location;
}
