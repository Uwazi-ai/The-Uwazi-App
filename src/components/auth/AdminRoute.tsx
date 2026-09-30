import { useProfile } from "@/contexts/ProfileContext";
import { Navigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";

interface AdminRouteProps {
  children: React.ReactNode;
  /** If true, allow program_admin too. Otherwise require super_admin. */
  allowProgramAdmin?: boolean;
  /** If true, allow the office reviewer role too. */
  allowReviewer?: boolean;
}

export function AdminRoute({ children, allowProgramAdmin = false, allowReviewer = false }: AdminRouteProps) {
  const { isAdmin, isProgramAdmin, isReviewer, profileLoaded } = useProfile();

  if (!profileLoaded) {
    return <LoadingScreen fullScreen={false} label="Loading your workspace" />;
  }

  const allowed = (allowProgramAdmin && isProgramAdmin) || (allowReviewer && isReviewer) || isAdmin;
  if (!allowed) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
