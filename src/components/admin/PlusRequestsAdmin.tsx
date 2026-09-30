import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Request = { id: string; user_id: string; reason: string; note: string | null; status: string; created_at: string };
export function PlusRequestsAdmin() {
  const [requests, setRequests] = useState<Request[]>([]);
  const load = async () => {
    const { data, error } = await supabase.from("plus_access_requests").select("id,user_id,reason,note,status,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) toast.error("Could not load Plus requests."); else setRequests(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const review = async (id: string, status: "reviewed" | "declined") => {
    const { error } = await supabase.from("plus_access_requests").update({ status }).eq("id", id);
    if (error) toast.error("Could not update request."); else { toast.success("Request updated"); load(); }
  };
  return <section className="space-y-4 rounded-lg border border-border bg-card p-4"><h2 className="font-heading text-xl">Free Plus requests</h2><p className="text-xs text-muted-foreground">Review does not grant access. Eligibility and fulfillment are not configured.</p>{requests.length === 0 ? <p className="text-sm text-muted-foreground">No requests yet.</p> : <div className="space-y-3">{requests.map((request) => <div key={request.id} className="border-t border-border pt-3 text-sm"><p className="font-semibold">{request.reason === "student" ? "Student" : "Low income"} · {request.status}</p><p className="text-xs text-muted-foreground">{new Date(request.created_at).toLocaleDateString()} · User {request.user_id.slice(0,8)}</p>{request.note && <p className="mt-1 whitespace-pre-wrap break-words text-foreground">{request.note}</p>}{request.status === "pending" && <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => review(request.id, "reviewed")}>Mark reviewed</Button><Button size="sm" variant="outline" onClick={() => review(request.id, "declined")}>Decline</Button></div>}</div>)}</div>}</section>;
}
