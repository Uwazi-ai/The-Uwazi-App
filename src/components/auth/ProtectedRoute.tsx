import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    (supabase.from("profiles") as any)
      .select("onboarding_complete, zip_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        const complete = data?.onboarding_complete === true;
        const zip = (data?.zip_code ?? "").toString().trim();
        // Strengthened: missing flag OR missing ZIP forces onboarding
        setNeedsOnboarding(!complete || zip === "");
        setChecking(false);
      });
  }, [user, location.pathname]);

  const isLoading = loading || checking;

  if (!isLoading && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isLoading && needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>
      <AnimatePresence>{isLoading && <LoadingScreen />}</AnimatePresence>
      {!isLoading && <>{children}</>}
    </>
  );
}
