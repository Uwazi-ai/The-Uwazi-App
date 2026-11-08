import { lazy, Suspense, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

const SproutGame = lazy(() => import("@/components/sprout/SproutGame").then(m => ({ default: m.SproutGame })));

/** Kid route: full screen, no app chrome, no links out. Phaser loads only when this page opens. */
export default function SproutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const exit = useCallback(() => navigate("/app", { replace: true }), [navigate]);
  if (!user) return <LoadingScreen />;
  return (
    <>
      <Helmet><title>Sprout's Garden</title><meta name="robots" content="noindex" /><meta name="theme-color" content="#1F2A33" /></Helmet>
      <Suspense fallback={<LoadingScreen />}>
        <SproutGame userId={user.id} onExit={exit} />
      </Suspense>
    </>
  );
}
