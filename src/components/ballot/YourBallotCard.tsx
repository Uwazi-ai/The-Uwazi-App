import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { ExternalLink, MapPin, Phone, Search, HelpCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { US_STATES, stateName } from "@/lib/usStates";
import { toast } from "sonner";
import { pickBallotLink, pickPhone, BALLOT_LINK_LABEL, VOTER_LOOKUP_HELPER } from "@/lib/ballotLink";

const db = supabase as any;
const ELECTION_DATE = "2026-11-03";
export const LOOKUP_SOURCE_LINE = "Source: Voting Information Project via Google. Check your official sample ballot.";

type Site = { name: string | null; address: string | null; hours: string | null };
type Lookup = {
  status: string; state: string | null; officialBallotUrl: string | null; officialBallotKind?: "sample_ballot" | "voter_lookup" | null;
  office: { name: string | null; phone: string | null; url: string | null; phoneFrom?: string | null };
  pollingLocations: Site[]; pollingTotal: number; earlyVoteSites: Site[]; earlyTotal: number; dropOffLocations: Site[]; dropOffTotal: number;
  contests: { type: string | null; office: string | null; district: string | null; candidates: { name: string | null; party: string | null }[]; referendumTitle: string | null; referendumSubtitle: string | null; referendumText: string | null; referendumUrl: string | null }[];
  stateLinks: { state_name: string; website_url: string | null; check_url: string | null; sample_ballot_url: string | null; phone: string | null } | null;
  attribution: string | null;
};

async function errText(error: any) {
  if (error instanceof FunctionsHttpError) { try { return (await error.context.json())?.error; } catch { /* ignore */ } }
  return null;
}

export function useStateHasVerified(state: string | null | undefined) {
  return useQuery({
    queryKey: ["state-has-verified", state],
    enabled: !!state,
    queryFn: async () => {
      const { count } = await db.from("ballot_contests").select("id", { count: "exact", head: true })
        .eq("state", state).eq("election_date", ELECTION_DATE).eq("verification_status", "verified");
      return (count ?? 0) > 0;
    },
  });
}

function SiteList({ title, sites, total }: { title: string; sites: Site[]; total: number }) {
  if (!sites.length) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-2">
        {sites.slice(0, 3).map((s, i) => (
          <li key={i} className="text-sm text-foreground break-words">
            <strong>{s.name || "Voting site"}</strong>{s.address ? <span className="block text-muted-foreground">{s.address}</span> : null}
            {s.hours ? <span className="block text-xs text-muted-foreground">Hours: {s.hours}</span> : null}
          </li>
        ))}
      </ul>
      {total > 3 && <p className="mt-1 text-xs text-muted-foreground">{total - 3} more sites. Your official sample ballot page has the full list.</p>}
    </div>
  );
}

/** "Your ballot" card for places where UWAZI has no verified contests. Nothing typed here is saved. */
export default function YourBallotCard({ state, zip, force = false }: { state: string | null | undefined; zip?: string | null; force?: boolean }) {
  const { data: hasVerified, isLoading } = useStateHasVerified(state);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Lookup | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const { data: link } = useQuery({
    queryKey: ["state-election-link", state],
    enabled: !!state,
    queryFn: async () => (await db.from("state_election_links").select("state_name, website_url, check_url, sample_ballot_url, phone, phone_verified").eq("state_code", state).maybeSingle()).data,
  });

  if (!force && (isLoading || hasVerified)) return null;

  const run = async () => {
    if (address.trim().length < 5) { toast.error("Enter your full street address."); return; }
    setBusy(true); setFailed(null);
    const { data, error } = await supabase.functions.invoke("ballot-lookup", { body: { address: address.trim(), state: state || undefined } });
    setBusy(false);
    if (error) { setFailed((await errText(error)) || "We could not look that up. Use your state link."); return; }
    setResult(data as Lookup);
  };

  const links = result?.stateLinks ?? link;
  const picked = result ? { url: result.officialBallotUrl, kind: result.officialBallotKind ?? null } : pickBallotLink(null, link);
  const officialUrl = picked.url;
  const phone = result ? (result.office?.phone || null) : pickPhone(null, link);
  const officeUrl = result?.office?.url || links?.website_url || links?.check_url || null;
  const officeName = result?.office?.name || (links ? `${links.state_name} election office` : state ? `${stateName(state)} election office` : "Your election office");

  return (
    <section className="rounded-2xl border border-primary/40 bg-card p-5 md:p-6 space-y-4 overflow-hidden" aria-label="Your ballot">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Your ballot</p>
        <h2 className="font-heading text-xl text-foreground mt-1">Find your official ballot for Nov 3</h2>
        <p className="text-sm text-muted-foreground mt-1">Your state election office has the official ballot. UWAZI does not endorse any candidate or side.</p>
      </div>

      {officialUrl ? (
        <Button asChild className="w-full sm:w-auto">
          <a href={officialUrl} target="_blank" rel="noreferrer">{BALLOT_LINK_LABEL[picked.kind ?? "voter_lookup"]} <ExternalLink className="ml-2 h-4 w-4" /></a>
        </Button>
      ) : null}
      {officialUrl && picked.kind === "voter_lookup" && <p className="text-sm text-muted-foreground -mt-2">{VOTER_LOOKUP_HELPER}</p>}
      {!officialUrl && (
        <p className="text-sm text-muted-foreground">Add your state in your profile to see your official link.</p>
      )}

      <div className="space-y-2">
        <label htmlFor="ballot-address" className="text-sm font-medium text-foreground">Find my exact ballot</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input id="ballot-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, state, ZIP" autoComplete="street-address"
            onKeyDown={(e) => { if (e.key === "Enter") run(); }} />
          <Button onClick={run} disabled={busy} variant="outline" className="shrink-0">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />} Look up
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">We do not save this address.</p>
        {failed && <p className="text-sm text-destructive">{failed}</p>}
      </div>

      {result && (
        <div className="space-y-4 border-t border-border pt-4">
          {result.pollingLocations.length > 0 && (
            <div className="flex gap-2"><MapPin className="h-4 w-4 text-primary mt-1 shrink-0" /><div className="min-w-0 flex-1"><SiteList title="Polling place" sites={result.pollingLocations} total={result.pollingTotal} /></div></div>
          )}
          {!result.pollingLocations.length && <p className="text-sm text-muted-foreground">No polling place came back for this address. Your official page has it.</p>}
          <SiteList title="Early voting" sites={result.earlyVoteSites} total={result.earlyTotal} />
          <SiteList title="Ballot drop off" sites={result.dropOffLocations} total={result.dropOffTotal} />
        </div>
      )}

      {phone ? (
        <div className="flex items-start gap-2 text-sm">
          <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{officeName}: <a className="text-primary underline" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></span>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-sm">
          <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">Contact your local election office.{officeUrl ? <> <a className="text-primary underline" href={officeUrl} target="_blank" rel="noreferrer">Official election page</a></> : null}</span>
        </div>
      )}

      {result && result.contests.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Contests from the lookup</p>
          <ul className="space-y-3">
            {result.contests.map((c, i) => (
              <li key={i} className="rounded-xl border border-border p-3 text-sm break-words">
                <p className="font-medium text-foreground">{c.office || c.referendumTitle || "Contest"}</p>
                {c.district && <p className="text-xs text-muted-foreground">{c.district}</p>}
                {c.referendumSubtitle && <p className="text-muted-foreground mt-1">{c.referendumSubtitle}</p>}
                {c.referendumText && <p className="text-muted-foreground mt-1 whitespace-pre-line">{c.referendumText}</p>}
                {c.referendumUrl && <a href={c.referendumUrl} target="_blank" rel="noreferrer" className="text-primary text-xs underline">Official text</a>}
                {c.candidates.length > 0 && (
                  <ul className="mt-2 space-y-1">{c.candidates.map((k, j) => <li key={j} className="text-foreground">{k.name}{k.party ? <span className="text-muted-foreground"> ({k.party})</span> : null}</li>)}</ul>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{LOOKUP_SOURCE_LINE}</p>
        </div>
      )}
      {result && result.attribution && result.contests.length === 0 && (
        <p className="text-xs text-muted-foreground">{LOOKUP_SOURCE_LINE}</p>
      )}

      <div className="border-t border-border pt-4 space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">More nonpartisan guides</p>
        <a href="https://www.vote411.org/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline">
          VOTE411.org from the League of Women Voters Education Fund <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setHelpOpen(true)}>
        <HelpCircle className="mr-2 h-4 w-4" /> Ask UWAZI to find my ballot
      </Button>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} defaultState={state || ""} defaultZip={zip || ""} />
    </section>
  );
}

function HelpDialog({ open, onOpenChange, defaultState, defaultZip }: { open: boolean; onOpenChange: (o: boolean) => void; defaultState: string; defaultZip: string }) {
  const [st, setSt] = useState(defaultState);
  const [city, setCity] = useState(defaultZip);
  const [street, setStreet] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!st || city.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim()) || !consent) { toast.error("Fill in state, city or ZIP, email, and check the box."); return; }
    setBusy(true);
    const { error } = await supabase.functions.invoke("ballot-help-request", { body: { state: st, cityOrZip: city.trim(), street: street.trim() || null, email: email.trim(), consent: true } });
    setBusy(false);
    if (error) { toast.error((await errText(error)) || "Could not send. Try again."); return; }
    setDone(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ask UWAZI to find my ballot</DialogTitle>
          <DialogDescription>A person on our team will look it up and email you.</DialogDescription>
        </DialogHeader>
        {done ? (
          <p className="text-sm text-foreground">Thanks. We got your request. We will email you.</p>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm">State
              <select value={st} onChange={(e) => setSt(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Pick a state</option>
                {US_STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </label>
            <label className="block text-sm">City or ZIP<Input className="mt-1" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} /></label>
            <label className="block text-sm">Street address (optional)<Input className="mt-1" value={street} onChange={(e) => setStreet(e.target.value)} maxLength={200} /></label>
            <label className="block text-sm">Email for our reply<Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} /></label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span>UWAZI may use this to find your ballot and email you. We delete it after Nov 10.</span>
            </label>
            <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Sending..." : "Send request"}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
