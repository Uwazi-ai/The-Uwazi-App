import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LoadingScreen } from "@/components/LoadingScreen";

export function RootRedirect() {
  const { user, loading } = useAuth();

  return (
    <>
      <AnimatePresence>{loading && <LoadingScreen />}</AnimatePresence>
      {!loading && (user ? <Navigate to="/app" replace /> : <Navigate to="/welcome" replace />)}
    </>
  );
}
