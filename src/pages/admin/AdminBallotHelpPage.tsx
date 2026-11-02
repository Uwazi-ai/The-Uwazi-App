import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExternalLink, Eye, Check, Pencil } from "lucide-react";
import { stateName } from "@/lib/usStates";

const db = supabase as any;
type Req = { id: string; state_code: string; city_or_zip: string; has_address: boolean; status: string; answered_note: string | null; answered_at: string | null; created_at: string };
type Link = { state_code: string; state_name: string; website_url: string | null; check_url: string | null; sample_ballot_url: string | null; phone: string | null; phone_verified?: boolean; notes: string | null; verified_at: string | null };

function RequestRow({ r, onDone }: { r: Req; onDone: () => void }) {
  const [shown, setShown] = useState<{ street_address: string | null; reply_email: string } | null>(null);
  const [note, setNote] = useState("");
  const reveal = async () => {
    const { data, error } = await db.rpc("admin_reveal_ballot_help", { _id: r.id });
    if (error) return toast.error("Could not reveal.");
    setShown(data?.[0] ?? null);
  };
  const answer = async () => {
    const { error } = await db.rpc("admin_answer_ballot_help", { _id: r.id, _note: note.trim() });
    if (error) return toast.error("Could not save.");
    toast.success("Marked answered."); onDone();
  };
  return (
    <Card className="p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-foreground">{stateName(r.state_code)}</strong>
        <span className="text-sm text-muted-foreground">{r.city_or_zip}</span>
        <Badge variant={r.status === "new" ? "default" : "secondary"}>{r.status === "new" ? "New" : "Answered"}</Badge>
        <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
      </div>
      {shown ? (
        <div className="text-sm break-words">
          <p>Street: {shown.street_address || "Not given"}</p>
          <p>Email: <a className="text-primary underline" href={`mailto:${shown.reply_email}?subject=${encodeURIComponent("Your ballot for Nov 3")}`}>{shown.reply_email}</a></p>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={reveal}><Eye className="mr-2 h-4 w-4" /> Show address and email</Button>
      )}
      {r.status === "new" ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short note, for example: sent county link" maxLength={500} />
          <Button size="sm" onClick={answer}><Check className="mr-2 h-4 w-4" /> Mark answered</Button>
        </div>
      ) : r.answered_note ? <p className="text-xs text-muted-foreground">Note: {r.answered_note}</p> : null}
    </Card>
  );
}

function LinkRow({ l, onSaved }: { l: Link; onSaved: () => void }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(l);
  const save = async () => {
    const { error } = await db.from("state_election_links").update({
      website_url: f.website_url || null, check_url: f.check_url || null, sample_ballot_url: f.sample_ballot_url || null,
      phone: f.phone || null, notes: f.notes || null, updated_at: new Date().toISOString(),
    }).eq("state_code", l.state_code);
    if (error) return toast.error("Could not save.");
    toast.success("Saved."); setEdit(false); onSaved();
  };
  const a = (u: string | null, label: string) => u ? <a href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">{label}<ExternalLink className="h-3 w-3" /></a> : <span className="text-muted-foreground">No {label.toLowerCase()}</span>;
  return (
    <Card className="p-3 text-sm space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <strong>{l.state_name}</strong>
        {l.verified_at ? <Badge variant="secondary">Checked {new Date(l.verified_at).toLocaleDateString()}</Badge> : <Badge variant="destructive">Not verified</Badge>}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEdit(!edit)}><Pencil className="h-4 w-4" /></Button>
      </div>
      {edit ? (
        <div className="grid gap-2">
          {(["website_url", "check_url", "sample_ballot_url", "phone", "notes"] as const).map((k) => (
            <Input key={k} placeholder={k} value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          ))}
          <Button size="sm" onClick={save}>Save</Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1 break-all">
          {a(l.website_url, "Website")}{a(l.check_url, "Check registration")}{a(l.sample_ballot_url, "Sample ballot")}
          <span>{l.phone || "No phone"}</span>
          {l.phone && (
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" className="accent-primary" checked={!!l.phone_verified} aria-label={`Phone checked for ${l.state_name}`}
                onChange={async (e) => {
                  const { error } = await db.from("state_election_links").update({ phone_verified: e.target.checked, updated_at: new Date().toISOString() }).eq("state_code", l.state_code);
                  if (error) toast.error("Could not save."); else { toast.success("Saved."); onSaved(); }
                }} />
              Phone checked
            </label>
          )}
        </div>
      )}
      {l.notes && !edit && <p className="text-xs text-muted-foreground">{l.notes}</p>}
    </Card>
  );
}

export default function AdminBallotHelpPage() {
  const qc = useQueryClient();
  const { data: reqs = [] } = useQuery({ queryKey: ["ballot-help"], queryFn: async () => ((await db.rpc("admin_list_ballot_help")).data ?? []) as Req[] });
  const { data: links = [] } = useQuery({ queryKey: ["state-links-admin"], queryFn: async () => ((await db.from("state_election_links").select("*").order("state_name")).data ?? []) as Link[] });
  const unverified = links.filter((l) => !l.verified_at || !l.phone).length;
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 pb-24 space-y-6 overflow-x-hidden">
      <header>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground">Ballot help</h1>
        <p className="text-sm text-muted-foreground mt-1">People who asked UWAZI to find their ballot. Requests are deleted after Nov 10.</p>
      </header>
      <section className="space-y-3">
        <h2 className="font-heading text-lg">Queue ({reqs.filter((r) => r.status === "new").length} new)</h2>
        {reqs.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
        {reqs.map((r) => <RequestRow key={r.id} r={r} onDone={() => qc.invalidateQueries({ queryKey: ["ballot-help"] })} />)}
      </section>
      <section className="space-y-3">
        <h2 className="font-heading text-lg">State election links ({links.length}, {unverified} need a look)</h2>
        <div className="grid gap-2">{links.map((l) => <LinkRow key={l.state_code} l={l} onSaved={() => qc.invalidateQueries({ queryKey: ["state-links-admin"] })} />)}</div>
      </section>
    </div>
  );
}
