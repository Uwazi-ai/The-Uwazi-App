import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// Shows only when 25 or more research-consented people in the same area took the quiz.
export function PeopleInCity() {
  const [row, setRow] = useState<{ label: string; people: number; area: string } | null>(null);
  useEffect(() => {
    db.rpc("city_top_identity").then(({ data }: any) => setRow(Array.isArray(data) && data[0] ? data[0] : null));
  }, []);
  if (!row) return null;
  return (
    <div className="bg-card rounded-2xl p-5 border border-border flex items-start gap-3">
      <Users className="h-6 w-6 text-primary shrink-0" />
      <div>
        <p className="font-semibold text-foreground">People in your {row.area === "city" ? "city" : "area"}</p>
        <p className="text-sm text-muted-foreground">The most common identity near you is <span className="text-foreground font-medium">{row.label}</span>. {row.people} neighbors have taken the quiz.</p>
      </div>
    </div>
  );
}
