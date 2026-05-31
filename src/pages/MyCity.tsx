import { useSubscription } from "@/hooks/useSubscription";
import { MyCityDashboard } from "@/components/my-city/MyCityDashboard";
import { MyCityPaywall } from "@/components/my-city/MyCityPaywall";

export default function MyCity() {
  const { isPremium, loading } = useSubscription();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }} />;
  }

  return isPremium ? <MyCityDashboard /> : <MyCityPaywall />;
}
