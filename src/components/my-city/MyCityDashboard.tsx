import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, ExternalLink, Flag, MessageCircle, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingScreen } from "@/components/LoadingScreen";

const db = supabase as any;
const askLink = (q: string) => `/app/ask?q=${encodeURIComponent(q)}`;

type Line = {
  id: string; geoid: string; fiscal_year: string; department_or_fund: string; category: string | null;
  revenue_or_expense: "revenue" | "expense"; amount: number; total_amount: number; percent_of_total: number | null;
  source_url: string | null; last_verified_at: string | null; data_source: string | null;
};
type Yoy = { id: string; prior_fiscal_year: string; change_amount: number; change_percent: number | null };
type Milestone = { id: string; fiscal_year: string; milestone: string; milestone_date: string; label: string | null; source_url: string | null; last_verified_at: string | null };
type Office = { id: string; office_title: string; current_holder: string | null; source_url: string | null; last_verified_at: string | null };

const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: v >= 1e6 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v);
const day = (d: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "not yet");
const MILESTONE: Record<string, string> = { proposal: "Budget is proposed", hearing: "Public hearing", adoption: "Council votes to adopt", fiscal_year_start: "New budget year starts" };

function SourceLine({ url, verified }: { url: string | null; verified: string | null }) {
  return (
    <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
          Source <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <span>Checked {day(verified)}</span>
    </p>
  );
}

function AskButton({ q, label }: { q: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link to={askLink(q)}><MessageCircle className="h-4 w-4 mr-1" />{label}</Link>
    </Button>
  );
}

export function MyCityDashboard() {
  const { user } = useAuth();
  const [fy, setFy] = useState<string | null>(null);
  const [target, setTarget] = useState<Line | null>(null);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const [scope, setScope] = useState<"city" | "county">("city");

  const { data: all, isLoading } = useQuery({
    queryKey: ["my-city-budget", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: ud } = await db.from("user_districts").select("resolved").eq("user_id", user!.id).maybeSingle();
      const place: string | null = ud?.resolved?.place ?? null;
      const county: string | null = ud?.resolved?.county ?? null;
      const { data: status } = await db.rpc("get_my_city_status");
      const cityName: string | null = (Array.isArray(status) ? status[0]?.place_name : status?.place_name) ?? null;
      const load = async (geoid: string | null, officeRe: RegExp) => {
        if (!geoid) return { place: geoid, lines: [] as Line[], yoy: [] as Yoy[], calendar: [] as Milestone[], offices: [] as Office[] };
        const [l, y, c, o] = await Promise.all([
          db.from("civic_budget_percent_of_total").select("*").eq("geoid", geoid),
          db.from("civic_budget_year_over_year").select("id, prior_fiscal_year, change_amount, change_percent").eq("geoid", geoid),
          db.from("civic_budget_calendar").select("*").eq("geoid", geoid).order("milestone_date"),
          db.from("civic_offices").select("id, office_title, current_holder, source_url, last_verified_at").eq("geoid", geoid),
        ]);
        const offices = ((o.data ?? []) as Office[])
          .filter((x) => officeRe.test(x.office_title))
          .sort((a, b) => (/mayor|executive/i.test(b.office_title) ? 1 : 0) - (/mayor|executive/i.test(a.office_title) ? 1 : 0) || a.office_title.localeCompare(b.office_title));
        return { place: geoid, lines: (l.data ?? []) as Line[], yoy: (y.data ?? []) as Yoy[], calendar: (c.data ?? []) as Milestone[], offices };
      };
      const [cityData, countyData] = await Promise.all([load(place, /mayor|council/i), load(county, /legislator|county executive/i)]);
      return { cityName, city: cityData, county: countyData };
    },
  });
  const isCounty = scope === "county";
  const data = all ? (isCounty ? all.county : all.city) : undefined;
  const countyHasBudget = (all?.county.lines.length ?? 0) > 0;
  const unit = isCounty ? "the county" : "the city";

  const years = useMemo(
    () => [...new Set((data?.lines ?? []).map((l) => l.fiscal_year))].sort().reverse(),
    [data?.lines],
  );
  useEffect(() => { if ((!fy || !years.includes(fy)) && years.length) setFy(years[0]); }, [years, fy]);

  if (isLoading) return <LoadingScreen fullScreen={false} />;

  const city = isCounty ? "Jackson County" : all?.cityName ?? "your city";
  const lines = (data?.lines ?? []).filter((l) => l.fiscal_year === fy);
  const spend = lines.filter((l) => l.revenue_or_expense === "expense").sort((a, b) => b.amount - a.amount);
  const revenue = lines.filter((l) => l.revenue_or_expense === "revenue").sort((a, b) => b.amount - a.amount);
  const yoy = new Map((data?.yoy ?? []).map((y) => [y.id, y]));
  const today = new Date().toISOString().slice(0, 10);
  const calendar = data?.calendar ?? [];
  const nextUpcoming = calendar.find((m) => m.milestone_date >= today);
  const hasBudget = years.length > 0;

  const send = async () => {
    if (!target) return;
    setSending(true);
    const { error } = await db.rpc("report_budget_issue", { _budget_id: target.id, _correct_value: value, _note: note });
    setSending(false);
    if (error) return toast.error(`We could not send that. ${error.message}`);
    toast.success("Thanks. Our team will check it.");
    setTarget(null); setValue(""); setNote("");
  };

  const reportLink = (l: Line) => (
    <button type="button" onClick={() => setTarget(l)} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
      <Flag className="h-3 w-3" /> Report inaccurate info
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 pb-28 md:pb-10 space-y-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl md:text-3xl text-foreground">Where your tax dollars go</h1>
        <p className="text-sm text-muted-foreground">See how {city} plans to spend its money and where the money comes from.</p>
      </header>

      {countyHasBudget && (
        <div role="tablist" className="inline-flex rounded-xl border border-border p-1 bg-card">
          {(["city", "county"] as const).map((k) => (
            <button key={k} role="tab" aria-selected={scope === k} onClick={() => setScope(k)}
              className={`px-4 py-1.5 rounded-lg text-sm ${scope === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {k === "city" ? "Your city" : "Your county"}
            </button>
          ))}
        </div>
      )}

      {!data?.place && (
        <section className="bg-card rounded-2xl border border-border p-6 space-y-3">
          <p className="text-foreground">Add your street address to see your city's budget.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm"><Link to="/app/settings">Add my address</Link></Button>
            <AskButton q="How does my city decide how to spend money?" label="Ask UWAZI" />
          </div>
        </section>
      )}

      {data?.place && !hasBudget && (
        <section className="bg-card rounded-2xl border border-border p-6 space-y-3">
          <p className="text-foreground font-medium">We are adding your {isCounty ? "county" : "city"}'s budget now. Here is what we have today.</p>
          <p className="text-sm text-muted-foreground">You can still see who votes on the budget below. You can also ask UWAZI how the budget works.</p>
          <AskButton q={`How does ${city} make its budget?`} label="Ask UWAZI" />
        </section>
      )}

      {hasBudget && (
        <div className="flex items-center gap-3">
          <Label htmlFor="fy" className="text-sm text-muted-foreground">Budget year</Label>
          <Select value={fy ?? undefined} onValueChange={setFy}>
            <SelectTrigger id="fy" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {spend.length > 0 && (
        <section className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Spending</h2>
            <p className="text-sm text-muted-foreground">Total: {money(spend[0].total_amount)} in {fy}.</p>
          </div>
          <ul className="space-y-4">
            {spend.map((l) => {
              const pct = Number(l.percent_of_total ?? 0);
              const ch = yoy.get(l.id);
              return (
                <li key={l.id} className="space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-foreground">{l.department_or_fund}</span>
                    <span className="text-foreground tabular-nums">{money(l.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Of every $100 {unit} spends, ${Math.round(pct)} goes to {l.department_or_fund}.
                  </p>
                  {ch && (
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      {ch.change_amount >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {ch.change_amount >= 0 ? "Up" : "Down"} {money(Math.abs(ch.change_amount))}
                      {ch.change_percent != null ? `, or ${Math.abs(ch.change_percent)}%,` : ""} from {ch.prior_fiscal_year}.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <SourceLine url={l.source_url} verified={l.last_verified_at} />
                    {reportLink(l)}
                  </div>
                </li>
              );
            })}
          </ul>
          {spend.some((l) => l.category) && (
            <p className="text-xs text-muted-foreground">{isCounty ? "The county" : "The city"} groups its spending by {spend[0].category?.toLowerCase() ?? "area"}. Each one covers several departments.</p>
          )}
        </section>
      )}

      {revenue.length > 0 && (
        <section className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Where the money comes from</h2>
            <p className="text-sm text-muted-foreground">Total: {money(revenue[0].total_amount)} in {fy}.</p>
          </div>
          <ul className="space-y-3">
            {revenue.map((l) => {
              const ch = yoy.get(l.id);
              return (
                <li key={l.id} className="space-y-1">
                  <div className="flex justify-between gap-3">
                    <span className="text-foreground">{l.department_or_fund}</span>
                    <span className="text-foreground tabular-nums">{money(l.amount)}, {Math.round(Number(l.percent_of_total ?? 0))}%</span>
                  </div>
                  {ch && (
                    <p className="text-xs text-muted-foreground">
                      {ch.change_amount >= 0 ? "Up" : "Down"} {money(Math.abs(ch.change_amount))} from {ch.prior_fiscal_year}.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <SourceLine url={l.source_url} verified={l.last_verified_at} />
                    {reportLink(l)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {calendar.length > 0 && (
        <section className="bg-card rounded-2xl border border-border p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">Budget calendar</h2>
          {!nextUpcoming && <p className="text-sm text-muted-foreground">These dates have passed. New dates will show here when {unit} posts them.</p>}
          <ul className="space-y-2">
            {calendar.map((m) => {
              const upcoming = m.milestone_date >= today;
              const isNext = nextUpcoming?.id === m.id;
              return (
                <li key={m.id} className={`rounded-xl border p-3 ${isNext ? "border-primary bg-primary/10" : "border-border"} ${upcoming ? "" : "opacity-70"}`}>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{day(m.milestone_date)}</span>
                    {isNext && <span className="text-xs text-primary font-semibold">Coming up</span>}
                  </div>
                  <p className="text-sm text-foreground">{MILESTONE[m.milestone] ?? m.milestone}{m.label ? `. ${m.label}` : ""}</p>
                  <SourceLine url={m.source_url} verified={m.last_verified_at} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(data?.offices.length ?? 0) > 0 && (
        <section className="bg-card rounded-2xl border border-border p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">Who votes on the budget</h2>
          <p className="text-sm text-muted-foreground">{isCounty ? "The county legislature votes to adopt the budget each year. The county executive can sign or veto it." : "The mayor and city council vote to adopt the budget each year."}</p>
          <ul className="grid sm:grid-cols-2 gap-3">
            {data!.offices.map((o) => (
              <li key={o.id} className="rounded-xl border border-border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">{o.office_title}</p>
                <p className="font-medium text-foreground">{o.current_holder ?? "Seat not listed"}</p>
                <SourceLine url={o.source_url} verified={o.last_verified_at} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-card rounded-2xl border border-border p-6 space-y-3">
        <h2 className="text-lg font-bold text-foreground">Your next step</h2>
        <p className="text-sm text-muted-foreground">
          {nextUpcoming
            ? `The next budget date is ${day(nextUpcoming.milestone_date)}. You can go and share what matters to you.`
            : isCounty ? "You can tell your county legislator what matters to you in the next budget." : "You can tell your council member what matters to you in the next budget."}
        </p>
        <AskButton q={`How can I speak up about the ${city} budget?`} label="Ask UWAZI how to speak up" />
      </section>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report inaccurate info</DialogTitle>
            <DialogDescription>
              {target ? `${target.department_or_fund}, ${target.fiscal_year}. We show ${money(target.amount)}.` : ""} Our team checks every report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="rv">The right amount, if you know it</Label>
              <Input id="rv" value={value} onChange={(e) => setValue(e.target.value)} placeholder="For example 740000000" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rn">What is wrong</Label>
              <Input id="rn" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tell us what you saw" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={send} disabled={sending || (!value.trim() && !note.trim())}>{sending ? "Sending" : "Send report"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
