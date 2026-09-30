import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const db = supabase as any;
export function AccessRequest() {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!user) return; db.from("plus_access_requests").select("status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }: any) => setStatus(data?.status ?? null)); }, [user]);
  const submit = async () => {
    if (!user || !reason) return;
    setSaving(true);
    const { error } = await db.from("plus_access_requests").insert({ user_id: user.id, reason, note: note.trim() || null });
    setSaving(false);
    if (error) return toast.error("Your request was not sent. Try again.");
    setStatus("pending"); toast.success("Your request was sent.");
  };
  return <section id="access-request" className="city-tile scroll-mt-24 rounded-[20px] border border-border bg-card p-5"><h2 className="font-heading text-lg">Request free Plus</h2><p className="mt-2 text-sm text-muted-foreground">For students and people with low income. We review each request. Eligibility rules and a review timeline are not set yet. Sending a request does not turn on Plus.</p>
    {status === "pending" ? <p className="mt-4 text-sm font-semibold text-primary">Your request is waiting for review.</p> : status === "approved" ? <p className="mt-4 text-sm font-semibold text-primary">Your request was approved. Contact support if you do not have access yet.</p> : <div className="mt-4 space-y-3"><div><Label htmlFor="plus-reason">Why are you asking?</Label><Select value={reason} onValueChange={setReason}><SelectTrigger id="plus-reason"><SelectValue placeholder="Choose one" /></SelectTrigger><SelectContent><SelectItem value="student">I am a student</SelectItem><SelectItem value="low_income">I have low income</SelectItem></SelectContent></Select></div><div><Label htmlFor="plus-note">Anything we should know? Optional</Label><Textarea id="plus-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></div><Button disabled={!reason || saving} onClick={submit}>Send my request</Button>{status === "declined" && <p className="text-xs text-muted-foreground">Your last request was declined. You can send a new one.</p>}</div>}
  </section>;
}
