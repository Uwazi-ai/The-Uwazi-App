import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePersonas } from "@/lib/personas";
import { PersonaBadge } from "./PersonaBadge";

const db = supabase as any;

// Shows only when 25 or more research-consented people in the same area took the quiz.
export function PeopleInCity() {
  const [row, setRow] = useState<{ label: string; people: number; area: string } | null>(null);
  useEffect(() => {
    db.rpc("city_top_identity").then(({ data }: any) => setRow(Array.isArray(data) && data[0] ? data[0] : null));
  }, []);
  const { list } = usePersonas();
  if (!row) return null;
  const p = list.find((x) => x.name === row.label);
  return (
    <div className="bg-card rounded-2xl p-5 border border-border flex items-start gap-3">
      <Users className="h-6 w-6 text-primary shrink-0" />
      <div>
        <p className="font-semibold text-foreground">People in your {row.area === "city" ? "city" : "area"}</p>
        <p className="text-sm text-muted-foreground">The most common civic persona near you is {p && <PersonaBadge slug={p.slug} size="chip" className="inline-block align-middle mx-1 h-6 w-6" label="" />}<span className="text-foreground font-medium">{row.label}</span>. {row.people} neighbors have taken the quiz.</p>
      </div>
    </div>
  );
}
