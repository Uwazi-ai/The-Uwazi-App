import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Public landing for printed card QR codes: /redeem?code=XXXX&c=campaign
 * Signed in  -> /app/redeem (code prefilled)
 * Signed out -> /signup (code carried through onboarding)
 */
export default function RedeemLandingPage() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const code = (params.get("code") || "").trim().toUpperCase();
  const qs = code ? `?code=${encodeURIComponent(code)}` : "";

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  return <Navigate to={user ? `/app/redeem${qs}` : `/signup${qs}`} replace />;
}
