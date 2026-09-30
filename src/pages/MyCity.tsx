import { useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { MyCityDashboard } from "@/components/my-city/MyCityDashboard";
import { MyCityPaywall } from "@/components/my-city/MyCityPaywall";
import { openMyCityUnlockModal } from "@/components/my-city/MyCityUnlockModal";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function MyCity() {
  const { isPremium, loading } = useSubscription();

  useEffect(() => {
    if (!loading && !isPremium) {
      openMyCityUnlockModal();
    }
  }, [loading, isPremium]);

  if (loading) {
    return <LoadingScreen fullScreen={false} label="Loading My City" />;
  }

  return isPremium ? <MyCityDashboard /> : <MyCityPaywall />;
}
