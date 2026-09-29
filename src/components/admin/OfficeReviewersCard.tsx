import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const db = supabase as any;

export function OfficeReviewersCard() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const reviewers = useQuery({
    queryKey: ["office-reviewers"],
    queryFn: async () => {
      const { data, error } = await db.rpc("list_office_reviewers");
      if (error) throw error;
      return (data ?? []) as { user_id: string; email: string }[];
    },
  });

  const setRole = async (target: string, grant: boolean) => {
    if (!target.trim()) { toast.error("Type an email first."); return; }
    const { error } = await db.rpc("set_office_reviewer", { _email: target.trim(), _grant: grant });
    if (error) { toast.error(error.message); return; }
    toast.success(grant ? "Reviewer added." : "Reviewer removed.");
    setEmail("");
    qc.invalidateQueries({ queryKey: ["office-reviewers"] });
  };

  return (
    <Card className="bg-card border-border p-4 space-y-4">
      <h3 className="text-sm font-axis uppercase text-foreground">OFFICE DATA REVIEWERS</h3>
      <p className="text-sm text-muted-foreground">
        Reviewers can open Office Data Health, run checks, add offices by hand, and approve or reject changes. They cannot add or turn on sources.
      </p>
      <div className="space-y-2">
        {!reviewers.data?.length && <p className="text-sm text-muted-foreground">No reviewers yet.</p>}
        {reviewers.data?.map((r) => (
          <div key={r.user_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm text-foreground break-all">{r.email}</span>
            <Button size="sm" variant="ghost" onClick={() => setRole(r.email, false)}>Remove</Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their account email" />
        <Button onClick={() => setRole(email, true)}>Add reviewer</Button>
      </div>
      <p className="text-xs text-muted-foreground">Next step: the person needs a UWAZI account first. Then add their email here.</p>
    </Card>
  );
}
