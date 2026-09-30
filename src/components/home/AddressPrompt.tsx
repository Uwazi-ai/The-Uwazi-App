import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const db = supabase as any;

/** Shown on Home when we still do not know where the person lives. */
export function AddressPrompt() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState(false);

  useEffect(() => {
    if (!user) return;
    db.from("profiles").select("zip_code, street_address").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => setNeeds(!data?.zip_code && !data?.street_address));
  }, [user]);

  if (!needs) return null;

  return (
    <div className="rounded-[20px] border border-primary/30 bg-primary/10 p-5">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-heading text-lg text-foreground">Add where you live</p>
          <p className="text-sm text-muted-foreground">
            We use it to find your seats, your ballot, and your city budget. We keep only the district codes.
          </p>
        </div>
      </div>
      <Button asChild className="mt-4 w-full sm:w-auto"><Link to="/onboarding">Add my address</Link></Button>
    </div>
  );
}
