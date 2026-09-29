import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Shows when this person's city is still being added. Never blocks what we already have. */
export function useMyCityStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-city-status", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_my_city_status");
      return ((data ?? [])[0] ?? null) as { place_name: string | null; status: string } | null;
    },
  });
}

export default function CityComingNotice({ showAsk = true }: { showAsk?: boolean }) {
  const { data } = useMyCityStatus();
  if (!data) return null;
  const city = data.place_name || "your city";
  const q = `What do you know about local offices in ${city} today?`;
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm space-y-2">
      <p className="text-foreground">We are adding {city} now. Here is what we have today.</p>
      {showAsk && (
        <Button asChild size="sm" variant="secondary">
          <Link to={`/app/ask?q=${encodeURIComponent(q)}`}><MessageCircle className="h-4 w-4 mr-1" />Ask UWAZI</Link>
        </Button>
      )}
    </div>
  );
}
