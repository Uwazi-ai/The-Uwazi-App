import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const db = supabase as any;

/** Sites an admin marked official. The city search trusts these like .gov sites. */
export function OfficialDomainsCard() {
  const qc = useQueryClient();
  const domains = useQuery({
    queryKey: ["official-domains-list"],
    queryFn: async () => {
      const { data, error } = await db.from("official_domains").select("*").order("added_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { domain: string; label: string | null; added_at: string }[];
    },
  });

  const remove = async (domain: string) => {
    const { error } = await db.from("official_domains").delete().eq("domain", domain);
    if (error) { toast.error(error.message); return; }
    toast.success(`${domain} was removed.`);
    ["official-domains-list", "official-domains"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  return (
    <Card className="bg-card border-border p-4 space-y-4">
      <h3 className="text-sm font-axis uppercase text-foreground">OFFICIAL SITES</h3>
      <p className="text-sm text-muted-foreground">
        The city search trusts these sites like .gov sites. Add one with Mark as official in the Cities section on Office Data Health.
      </p>
      <div className="space-y-2">
        {!domains.data?.length && <p className="text-sm text-muted-foreground">No sites added yet.</p>}
        {domains.data?.map((d) => (
          <div key={d.domain} className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm text-foreground break-all">{d.domain}</div>
              <div className="text-xs text-muted-foreground">
                {d.label ? `${d.label}. ` : ""}Added {new Date(d.added_at).toLocaleDateString()}.
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => remove(d.domain)}>Remove</Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Next step: remove any site you no longer trust. Pages already found stay in place.</p>
    </Card>
  );
}
