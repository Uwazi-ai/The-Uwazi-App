import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const db = supabase as any;

export function CompassOfficesReport({ sessionId }: { sessionId?: string | null }) {
  const [target, setTarget] = useState<any | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    db.rpc("award_report_unlock", { _session_id: sessionId }).then(({ data }: any) => {
      if (data > 0) toast.success(`+${data} points for opening your full report`);
    });
  }, [sessionId]);
  const [field, setField] = useState("current_holder");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const { data: offices = [] } = useQuery({
    queryKey: ["compass-offices"],
    queryFn: async () => {
      const { data } = await db.from("civic_offices").select("id, office_title, current_holder, term_end, last_verified_at").order("office_title").limit(50);
      return data ?? [];
    },
  });

  const send = async () => {
    setSending(true);
    const { error } = await db.rpc("report_office_issue", { _office_id: target.id, _field: field, _correct_value: value, _note: note });
    setSending(false);
    if (error) return toast.error(`We could not send that. ${error.message}`);
    toast.success("Thanks. Our team will check it.");
    setTarget(null); setValue(""); setNote("");
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-3">
      <h3 className="text-lg font-bold text-foreground">Who works on these issues near you</h3>
      {!offices.length ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">We do not have local offices for your area yet.</p>
          <Button asChild variant="secondary" size="sm">
            <Link to={`/app/ask?q=${encodeURIComponent("Who are my local elected officials?")}`}><MessageCircle className="h-4 w-4 mr-1" />Ask UWAZI</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {offices.map((o: any) => (
            <li key={o.id} className="py-2 flex items-start justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium text-foreground">{o.office_title}</div>
                <div className="text-muted-foreground">{o.current_holder ?? "No one listed"}{o.term_end ? `. Term: ${o.term_end}` : ""}</div>
              </div>
              <button className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 shrink-0" onClick={() => setTarget(o)}>
                <Flag className="h-3 w-3" /> Report inaccurate info
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report wrong info</DialogTitle>
            <DialogDescription>{target?.office_title}. Tell us what is wrong. Our team checks every report.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>What is wrong?</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={field} onChange={(e) => setField(e.target.value)}>
                <option value="current_holder">The person in office</option>
                <option value="office_title">The office name</option>
                <option value="term_end">The term</option>
                <option value="other">Something else</option>
              </select>
            </div>
            <div><Label>What should it say?</Label><Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={300} /></div>
            <div><Label>Where did you see this? Optional</Label><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></div>
          </div>
          <DialogFooter>
            <Button onClick={send} disabled={sending || (!value.trim() && !note.trim())}>{sending ? "Sending…" : "Send report"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
