import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-semibold text-lg">Loading...</div>
      </div>
    );
  }

  return user ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />;
}
