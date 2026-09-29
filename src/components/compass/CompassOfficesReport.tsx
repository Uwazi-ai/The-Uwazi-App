import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Flag, MessageCircle, Lock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useMyDistricts, ADD_ADDRESS_LINE } from "@/hooks/useMyOffices";
import CityComingNotice from "@/components/voting/CityComingNotice";
import { LoadingScreen } from "@/components/LoadingScreen";

const db = supabase as any;
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

type Match = {
  id: string; office_id: string; match_score: number; reasoning: string; policy_priorities: string[]; created_at: string;
  office: { office_title: string; current_holder: string | null; source_url: string | null; last_verified_at: string | null; geoid: string | null; jurisdiction_level: string | null } | null;
};

const askLink = (q: string) => `/app/ask?q=${encodeURIComponent(q)}`;

async function loadMatches(sessionId: string): Promise<Match[]> {
  const { data, error } = await db
    .from("compass_office_matches")
    .select("id, office_id, match_score, reasoning, policy_priorities, created_at, office:civic_offices(office_title, current_holder, source_url, last_verified_at, geoid, jurisdiction_level)")
    .eq("session_id", sessionId)
    .order("match_score", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Share of every $100 for each office, only if city budget rows exist. */
async function loadBudgetShares(): Promise<Record<string, number>> {
  const { data, error } = await db.from("civic_budgets").select("office_id, amount");
  if (error || !data?.length) return {};
  const total = data.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
  if (!total) return {};
  const out: Record<string, number> = {};
  for (const r of data) if (r.office_id) out[r.office_id] = (out[r.office_id] ?? 0) + (Number(r.amount) / total) * 100;
  return out;
}

export function CompassOfficesReport({ sessionId }: { sessionId?: string | null }) {
  const [state, setState] = useState<"locked" | "loading" | "ready" | "error">("locked");
  const [matches, setMatches] = useState<Match[]>([]);
  const [shares, setShares] = useState<Record<string, number>>({});
  const [errMsg, setErrMsg] = useState("");
  const { data: districts } = useMyDistricts();

  const [target, setTarget] = useState<any | null>(null);
  const [field, setField] = useState("current_holder");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  // If this session already has a report, show it right away.
  useEffect(() => {
    if (!sessionId) return;
    loadMatches(sessionId).then((m) => { if (m.length) { setMatches(m); setState("ready"); loadBudgetShares().then(setShares); } }).catch(() => {});
  }, [sessionId]);

  const unlock = async () => {
    if (!sessionId) return;
    setState("loading");
    try {
      db.rpc("award_report_unlock", { _session_id: sessionId }).then(({ data }: any) => {
        if (data > 0) toast.success(`+${data} points for opening your full report`);
      });
      let rows = await loadMatches(sessionId);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: dist } = await db.from("user_districts").select("updated_at").eq("user_id", user?.id).maybeSingle();
      const oldest = rows.length ? Math.min(...rows.map((r) => new Date(r.created_at).getTime())) : 0;
      const stale = !rows.length || Date.now() - oldest > MAX_AGE_MS || (dist?.updated_at && new Date(dist.updated_at).getTime() > oldest);
      if (stale) {
        const { data, error } = await supabase.functions.invoke("compass-match", { body: { session_id: sessionId } });
        if (error) {
          let msg = "We could not build your report right now. Please try again later.";
          try { const b = await (error as any).context?.json?.(); if (b?.error) msg = typeof b.error === "string" ? b.error : msg; } catch { /* keep default */ }
          throw new Error(msg);
        }
        if ((data as any)?.error) throw new Error((data as any).error);
        rows = await loadMatches(sessionId);
      }
      setMatches(rows);
      setShares(await loadBudgetShares());
      setState("ready");
    } catch (e: any) {
      setErrMsg(e?.message ?? "Something went wrong.");
      setState("error");
    }
  };

  const send = async () => {
    setSending(true);
    const { error } = await db.rpc("report_office_issue", { _office_id: target.id, _field: field, _correct_value: value, _note: note });
    setSending(false);
    if (error) return toast.error(`We could not send that. ${error.message}`);
    toast.success("Thanks. Our team will check it.");
    setTarget(null); setValue(""); setNote("");
  };

  if (state === "locked" || state === "error") {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-card border border-border text-center space-y-3">
        <Lock className="h-6 w-6 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Your full Civic Compass report</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          See which local offices work on the issues you care about most. You can reach out to each one.
        </p>
        {state === "error" && <p className="text-sm text-destructive">{errMsg}</p>}
        <Button onClick={unlock} disabled={!sessionId}>{state === "error" ? "Try again" : "Unlock my report"}</Button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
        <LoadingScreen fullScreen={false} />
        <p className="text-sm text-muted-foreground text-center">We are matching your issues to your local offices.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-4">
      <h3 className="text-lg font-bold text-foreground">Offices that work on your issues</h3>
      <CityComingNotice showAsk={matches.length > 0} />
      {!matches.length ? (
        <p className="text-sm text-muted-foreground">We do not have local offices for your area yet. They will show here as your city adds them.</p>
      ) : (
        <div className="space-y-5">
        {groupOffices(matches.map((m, i) => ({ ...m, rank: i + 1, jurisdiction_level: m.office?.jurisdiction_level ?? null }))).map((g) => (
        <section key={g.key} className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground">{g.label}</h4>
        <ol className="space-y-3">
          {g.items.map((m) => (
            <li key={m.id} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-primary font-semibold">#{m.rank}</div>
                  <div className="font-semibold text-foreground">{m.office?.office_title}</div>
                  <div className="text-sm text-muted-foreground">{m.office?.current_holder ?? "No one listed"}</div>
                </div>
              </div>
              <p className="text-sm text-foreground">{m.reasoning}</p>
              {m.policy_priorities?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {m.policy_priorities.map((p) => (
                    <span key={p} className="text-xs rounded-full bg-muted px-2 py-1 text-foreground">{p}</span>
                  ))}
                </div>
              )}
              {shares[m.office_id] > 0 && (
                <p className="text-xs text-muted-foreground">This office shapes about ${Math.round(shares[m.office_id])} of every $100 the city spends.</p>
              )}
              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                {m.office?.source_url && (
                  <a href={m.office.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                    <ExternalLink className="h-3 w-3" /> Source
                  </a>
                )}
                {m.office?.last_verified_at && <span>Checked {new Date(m.office.last_verified_at).toLocaleDateString()}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="sm" variant="secondary">
                  <Link to={askLink(`How do I contact the ${m.office?.office_title}${m.office?.current_holder ? `, ${m.office.current_holder}` : ""}?`)}>
                    <MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI how to contact this office
                  </Link>
                </Button>
                <button
                  className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  onClick={() => setTarget({ id: m.office_id, office_title: m.office?.office_title })}
                >
                  <Flag className="h-3 w-3" /> Report inaccurate info
                </button>
              </div>
            </li>
          ))}
        </ol>
        </section>
        ))}
        </div>
      )}
      {matches.length > 0 && matches.length < 3 && (
        <p className="text-sm text-muted-foreground">More offices will show here as your city adds them.</p>
      )}
      {districts?.precision === "zip" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{ADD_ADDRESS_LINE}</p>
          <Button asChild size="sm" variant="outline"><Link to="/app/settings">Add your address</Link></Button>
        </div>
      )}
      <div className="pt-1">
        <p className="text-sm text-foreground mb-2">Next step: pick one office and reach out this week.</p>
        <Button asChild size="sm">
          <Link to={askLink("How can I share my views with my local offices?")}><MessageCircle className="h-4 w-4 mr-1" />Ask UWAZI where to start</Link>
        </Button>
      </div>
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
