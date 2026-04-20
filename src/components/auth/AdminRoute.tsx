import { useProfile } from "@/contexts/ProfileContext";
import { Navigate } from "react-router-dom";

interface AdminRouteProps {
  children: React.ReactNode;
  /** If true, allow program_admin too. Otherwise require super_admin. */
  allowProgramAdmin?: boolean;
}

export function AdminRoute({ children, allowProgramAdmin = false }: AdminRouteProps) {
  const { isAdmin, isProgramAdmin, profileLoaded } = useProfile();

  if (!profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-semibold text-lg">Loading...</div>
      </div>
    );
  }

  const allowed = allowProgramAdmin ? isProgramAdmin : isAdmin;
  if (!allowed) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
