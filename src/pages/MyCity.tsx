import { useSubscription } from "@/hooks/useSubscription";
import { MyCityDashboard } from "@/components/my-city/MyCityDashboard";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function MyCity() {
  const { isPremium, loading } = useSubscription();
  if (loading) return <LoadingScreen fullScreen={false} label="Loading My City" />;
  // Free people see the total and the biggest area. The rest sits behind a soft lock.
  return <MyCityDashboard preview={!isPremium} />;
}
