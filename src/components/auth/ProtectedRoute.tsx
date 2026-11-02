import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";

/** Remembers on this device who already finished setup, so a slow read never re-onboards them. */
const doneKey = (id: string) => `uwazi:onboarded:${id}`;

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkedFor, setCheckedFor] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (location.pathname === "/onboarding") {
      setCheckedFor(user.id);
      return;
    }
    if (localStorage.getItem(doneKey(user.id)) === "1") {
      setNeedsOnboarding(false);
      setCheckedFor(user.id);
      return;
    }
    let active = true;
    (supabase.from("profiles") as any)
      .select("onboarding_complete, zip_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }: { data: any; error: any }) => {
        if (!active) return;
        // Only send to setup when we know for sure it was never done.
        // A failed read, or a saved ZIP, counts as already set up.
        const done = !!error || data?.onboarding_complete === true || !!data?.zip_code;
        if (done && !error) localStorage.setItem(doneKey(user.id), "1");
        setNeedsOnboarding(!done);
        setCheckedFor(user.id);
      });
    return () => {
      active = false;
    };
  }, [user, location.pathname]);

  const checking = !!user && checkedFor !== user.id;
  const isLoading = loading || checking;

  if (!isLoading && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isLoading && needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return isLoading ? <LoadingScreen /> : <>{children}</>;
}
