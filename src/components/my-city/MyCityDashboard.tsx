import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Flag, MessageCircle, TrendingDown, TrendingUp } from "lucide-react";
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

const money = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: v >= 1e6 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v);
const day = (d: string | null) => d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "not yet";
const MILESTONE: Record<string, string> = { proposal: "Budget is proposed", hearing: "Public hearing", adoption: "Council votes to adopt", fiscal_year_start: "New budget year starts" };
const PLAIN_NAMES: Record<string, Record<string, string>> = {
  "2938000": {
    "Infrastructure and Accessibility": "Streets, water, and getting around",
    "Public Safety": "Police, fire, and 911",
    "Housing and Healthy Communities": "Housing and healthy neighborhoods",
    "Inclusive Growth and Development": "Jobs and business growth",
    "Finance and Governance": "Running City Hall",
  },
};
const CITY_NAMES: Record<string, string> = { "2938000": "Kansas City, Missouri" };
const plainName = (l: Line) => PLAIN_NAMES[l.geoid]?.[l.department_or_fund] ?? l.department_or_fund;
const tone = (index: number) => `city-tone-${index % 5}`;
const tile = "city-tile min-w-0 rounded-[20px] border border-border bg-card p-4 sm:p-6";
function SourceLine({ url, verified }: { url: string | null; verified: string | null }) {
  return <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
    {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">Source <ExternalLink className="h-3 w-3" /></a>}
    <span>Checked {day(verified)}</span>
  </p>;
}
function AskButton({ q, label, variant = "default", pulse = false }: { q: string; label: string; variant?: "default" | "outline"; pulse?: boolean }) {
  return <Button asChild variant={variant} size="sm" className={`h-auto min-h-11 whitespace-normal text-left ${pulse ? "city-pulse" : ""}`}>
    <Link to={askLink(q)}><MessageCircle className="mr-1 h-4 w-4 shrink-0" />{label}</Link>
  </Button>;
}
function useCountUp(value: number) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setShown(0); frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}
function TotalNumber({ amount }: { amount: number }) {
  const shown = useCountUp(amount);
  const divisor = amount >= 1e9 ? 1e9 : amount >= 1e6 ? 1e6 : amount >= 1e3 ? 1e3 : 1;
  const suffix = divisor === 1e9 ? "B" : divisor === 1e6 ? "M" : divisor === 1e3 ? "K" : "";
  return <span className="flex flex-wrap items-baseline gap-x-2 font-heading text-primary tabular-nums" aria-label={money(amount)}>
    <span className="text-[68px] leading-none lg:text-[128px]">${(shown / divisor).toFixed(divisor === 1 ? 0 : 1)}</span><span className="text-3xl lg:text-5xl">{suffix}</span>
  </span>;
}
export function MyCityDashboard() {
  const { user } = useAuth();
  const [fy, setFy] = useState<string | null>(null);
  const [target, setTarget] = useState<Line | null>(null);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [scope, setScope] = useState<"city" | "county">("city");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: all, isLoading } = useQuery({
    queryKey: ["my-city-budget", user?.id], enabled: !!user?.id,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to see your budget.");
      let { data: ud } = await db.from("user_districts").select("resolved").eq("user_id", user.id).maybeSingle();
      if (!ud?.resolved?.place && !ud?.resolved?.county) {
        const { data: prof } = await db.from("profiles").select("address, full_address, street_address").eq("user_id", user.id).maybeSingle();
        const addr = prof?.address || prof?.full_address || prof?.street_address || null;
        if (addr) {
          try {
            await supabase.functions.invoke("resolve-address", { body: { address: addr } });
            const again = await db.from("user_districts").select("resolved").eq("user_id", user.id).maybeSingle();
            ud = again.data;
          } catch (e) { console.error("resolve-address failed:", e); }
        }
      }
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
        const offices = ((o.data ?? []) as Office[]).filter((x) => officeRe.test(x.office_title))
          .sort((a, b) => (/mayor|executive/i.test(b.office_title) ? 1 : 0) - (/mayor|executive/i.test(a.office_title) ? 1 : 0) || a.office_title.localeCompare(b.office_title));
        return { place: geoid, lines: (l.data ?? []) as Line[], yoy: (y.data ?? []) as Yoy[], calendar: (c.data ?? []) as Milestone[], offices };
      };
      const [cityData, countyData] = await Promise.all([load(place, /mayor|council/i), load(county, /legislator|county executive/i)]);
      return { cityName, city: cityData, county: countyData };
    },
  });
  const { data: split } = useQuery({
    queryKey: ["my-city-compass-split", user?.id], enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return null;
      const { data: session } = await supabase.from("compass_sessions").select("id").eq("user_id", user.id).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(1).maybeSingle();
      if (!session) return null;
      const { data } = await supabase.from("compass_budget_priorities").select("allocation").eq("session_id", session.id).limit(1).maybeSingle();
      return data?.allocation && typeof data.allocation === "object" && !Array.isArray(data.allocation) ? data.allocation as Record<string, number> : null;
    },
  });
  const isCounty = scope === "county";
  const data = all ? (isCounty ? all.county : all.city) : undefined;
  const countyHasBudget = (all?.county.lines.length ?? 0) > 0;
  const unit = isCounty ? "the county" : "the city";
  const years = useMemo(() => [...new Set((data?.lines ?? []).map((l) => l.fiscal_year))].sort().reverse(), [data?.lines]);
  useEffect(() => { if ((!fy || !years.includes(fy)) && years.length) setFy(years[0]); }, [years, fy]);
  useEffect(() => setSelectedId(null), [fy, scope]);
  if (isLoading) return <LoadingScreen fullScreen={false} />;

  const city = isCounty ? (data?.place === "29095" ? "Jackson County, Missouri" : "your county") : (data?.place ? CITY_NAMES[data.place] : null) ?? all?.cityName ?? "your city";
  const lines = (data?.lines ?? []).filter((l) => l.fiscal_year === fy);
  const spend = lines.filter((l) => l.revenue_or_expense === "expense").sort((a, b) => b.amount - a.amount);
  const revenue = lines.filter((l) => l.revenue_or_expense === "revenue").sort((a, b) => b.amount - a.amount);
  const yoy = new Map((data?.yoy ?? []).map((y) => [y.id, y]));
  const today = new Date().toISOString().slice(0, 10);
  const calendar = data?.calendar ?? [];
  const nextUpcoming = calendar.find((m) => m.milestone_date >= today);
  const hasBudget = years.length > 0;
  const selected = spend.find((l) => l.id === selectedId);
  const selectedIndex = selected ? spend.indexOf(selected) : 0;
  const displayYears = [...new Set([...years, ...calendar.map((m) => m.fiscal_year)])].sort().reverse().slice(0, 2);
  const send = async () => {
    if (!target) return;
    setSending(true);
    const { error } = await db.rpc("report_budget_issue", { _budget_id: target.id, _correct_value: value, _note: note });
    setSending(false);
    if (error) return toast.error(`We could not send that. ${error.message}`);
    toast.success("Thanks. Our team will check it."); setTarget(null); setValue(""); setNote("");
  };
  const reportLink = (l: Line) => <Button type="button" variant="link" size="sm" onClick={() => setTarget(l)} className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"><Flag className="mr-1 h-3 w-3" />Report inaccurate info</Button>;
  const change = (l: Line) => { const ch = yoy.get(l.id); return ch && <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">{ch.change_amount >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{ch.change_amount >= 0 ? "Up" : "Down"} {money(Math.abs(ch.change_amount))}{ch.change_percent != null ? `, or ${Math.abs(ch.change_percent)}%,` : ""} from {ch.prior_fiscal_year}.</p>; };
  return <div className="city-bento mx-auto max-w-6xl space-y-5 px-4 py-8 pb-28 md:px-8 md:pb-10">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow mb-2">{city}</p><h1 className="font-heading text-[30px] leading-tight text-foreground">Where your tax dollars go</h1></div>
      {(hasBudget || displayYears.length > 0) && <div className="flex flex-wrap items-center gap-2" aria-label="Budget year">
        {displayYears.map((year) => years.includes(year) ? <Button key={year} size="sm" variant={fy === year ? "default" : "outline"} onClick={() => setFy(year)} aria-pressed={fy === year} className="rounded-full">{year}</Button> : <span key={year} className="group relative"><Button size="sm" variant="outline" disabled className="rounded-full">{year}</Button><span className="block max-w-40 text-xs text-muted-foreground sm:absolute sm:right-0 sm:top-full sm:z-10 sm:hidden sm:w-60 sm:max-w-none sm:rounded-md sm:bg-popover sm:p-2 sm:shadow-md">Last year's numbers are in review. They will show here once a person approves them.</span></span>)}
        {years.length > 2 && <Select value={fy ?? undefined} onValueChange={setFy}><SelectTrigger aria-label="More budget years" className="h-9 w-32 rounded-full"><SelectValue placeholder="More years" /></SelectTrigger><SelectContent>{years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select>}
      </div>}
    </header>
    {countyHasBudget && <div role="tablist" aria-label="Budget area" className="inline-flex gap-1 rounded-full border border-border bg-card p-1">{(["city", "county"] as const).map((k) => <Button key={k} role="tab" aria-selected={scope === k} size="sm" variant={scope === k ? "default" : "ghost"} onClick={() => setScope(k)} className="rounded-full">{k === "city" ? "Your city" : "Your county"}</Button>)}</div>}
    <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-4">
      {!data?.place && <section className={`${tile} col-span-2 lg:col-span-4`}><p>Add your street address to see your city's budget.</p><div className="mt-4 flex flex-wrap gap-2"><Button asChild size="sm"><Link to="/app/settings">Add my address</Link></Button><AskButton q="How does my city decide how to spend money?" label="Ask UWAZI" variant="outline" /></div></section>}
      {data?.place && !hasBudget && <section className={`${tile} col-span-2 lg:col-span-4`}><h2 className="font-heading text-xl">We are adding your {isCounty ? "county" : "city"}'s budget now. Here is what we have today.</h2><p className="my-3 text-sm text-muted-foreground">You can still see who votes on the budget below. You can also ask UWAZI how the budget works.</p><AskButton q={`How does ${city} make its budget?`} label="Ask UWAZI" /></section>}
      {spend.length > 0 && preview && (() => { const top = [...spend].sort((a, b) => Number(b.amount) - Number(a.amount))[0]; return <>
        <section className={`${tile} col-span-2 flex flex-col justify-between`} data-testid="city-total">
          <div><p className="text-sm text-muted-foreground">{isCounty ? "The county" : "The city"} plans to spend</p><TotalNumber amount={Number(spend[0].total_amount)} /><p className="mt-3 text-sm text-muted-foreground">this year.</p></div>
          <div className="mt-6"><SourceLine url={spend[0].source_url} verified={spend[0].last_verified_at} /></div>
        </section>
        <section className={`${tile} city-spend-tile ${tone(0)} col-span-2 relative`} data-testid="city-top-area">
          <div className="city-tone-tint pointer-events-none absolute inset-0 rounded-[20px]" />
          <p className="relative text-xs text-muted-foreground">The biggest spending area</p>
          <p className="relative city-tone-text mt-4 font-heading text-5xl leading-none">${Math.round(Number(top.percent_of_total ?? 0))}</p>
          <p className="relative mt-3 font-heading text-base text-foreground">{plainName(top)}</p>
          <p className="relative mt-2 text-sm text-foreground">${Math.round(Number(top.percent_of_total ?? 0))} of every $100 {unit} spends goes here.</p>
        </section>
        <section className={`${tile} relative col-span-2 min-h-[320px] overflow-hidden lg:col-span-4`} data-testid="city-locked">
          <div className="pointer-events-none grid grid-cols-2 gap-3 opacity-50 blur-md lg:grid-cols-4" aria-hidden>
            {["Other spending areas", "Where the money comes from", "Year over year", "Budget calendar", "Who votes on the budget", "Your $100 vs the city's"].map((t, i) => <div key={t} className={`${tone(i)} city-tone-tint h-28 rounded-xl p-3`}><p className="font-heading text-sm">{t}</p></div>)}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 p-6 text-center backdrop-blur-sm">
            <PlusMark className="h-6" />
            <p className="max-w-sm text-sm text-foreground">See every spending area, where the money comes from, how it changed, the budget calendar, and who votes.</p>
            <Button size="lg" onClick={() => openPaywall("my_city")}><Lock className="h-4 w-4" />Unlock full budget with Plus</Button>
          </div>
        </section>
      </>; })()}
      {spend.length > 0 && !preview && <>
        <section style={{ "--tile-order": 0 } as React.CSSProperties} className={`${tile} col-span-2 flex flex-col justify-between lg:row-span-2`}>
          <div><p className="text-sm text-muted-foreground">{isCounty ? "The county" : "The city"} plans to spend</p><TotalNumber amount={Number(spend[0].total_amount)} /><p className="mt-3 text-sm text-muted-foreground">this year. Tap any card to learn more.</p></div>
          <div className="mt-8"><SourceLine url={spend[0].source_url} verified={spend[0].last_verified_at} />{reportLink(spend[0])}</div>
        </section>
        <section style={{ "--tile-order": 1 } as React.CSSProperties} className={`${tile} col-span-2`}><h2 className="font-heading text-lg">Of every $100 {unit} spends</h2><div className="mt-7 flex h-9 overflow-hidden rounded-md bg-muted" role="group" aria-label="Spending by area">{spend.map((l, i) => <Button key={l.id} type="button" variant="ghost" onClick={() => setSelectedId(l.id)} aria-label={`Select ${plainName(l)}, ${Math.round(Number(l.percent_of_total ?? 0))} percent`} title={plainName(l)} className={`${tone(i)} city-bar-segment city-tone-bg h-full min-w-0 rounded-none p-0 hover:opacity-80`} style={{ width: `${Math.max(0, Number(l.percent_of_total ?? 0))}%` }} />)}</div><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{spend.slice(0, 5).map((l, i) => <span key={l.id} className="flex items-center gap-1"><i className={`${tone(i)} city-tone-bg size-2 rounded-full`} />{plainName(l)}</span>)}</div></section>
        <section style={{ "--tile-order": 2 } as React.CSSProperties} className={`${tile} col-span-2 border-primary bg-primary/10`}><p className="eyebrow">Compass</p><h2 className="font-heading mt-2 text-lg">Your $100 vs the city's</h2>{split ? <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="font-semibold text-primary">Your split</p>{Object.entries(split).map(([key, amount]) => <p key={key} className="flex justify-between gap-2 text-foreground"><span>{key.replace(/_/g, " ")}</span><span className="font-heading">${amount}</span></p>)}</div><div><p className="font-semibold text-primary">City spending</p>{spend.slice(0, 6).map((l) => <p key={l.id} className="flex justify-between gap-2 text-foreground"><span>{plainName(l)}</span><span className="font-heading">${Math.round(Number(l.percent_of_total ?? 0))}</span></p>)}</div></div> : <><p className="my-3 text-sm text-muted-foreground">Split $100 in the Civic Compass and see it next to how the city really spends.</p><Button asChild size="sm" className="city-pulse h-auto min-h-11 whitespace-normal"><Link to="/app/compass">Take the Compass to compare</Link></Button></>}</section>
        {spend.map((l, i) => <section key={l.id} style={{ "--tile-order": i + 3 } as React.CSSProperties} className={`${tile} city-spend-tile ${tone(i)} ${i === 0 ? "col-span-2" : "col-span-1"} relative transition-opacity duration-200 ${selectedId && selectedId !== l.id ? "opacity-55" : ""} ${selectedId === l.id ? "city-tone-border" : ""}`}>
          <div className="city-tone-tint pointer-events-none absolute inset-0 rounded-[20px]" />
          <Button type="button" variant="ghost" aria-pressed={selectedId === l.id} aria-label={`Learn more about ${plainName(l)}`} onClick={() => setSelectedId(selectedId === l.id ? null : l.id)} className="relative z-10 flex h-auto min-h-11 w-full flex-col items-start whitespace-normal p-0 text-left hover:bg-transparent">
            <span className="flex w-full items-center justify-between gap-2 text-xs text-foreground"><span className="flex items-center gap-2"><i className="city-tone-bg size-2 rounded-full" />{Math.round(Number(l.percent_of_total ?? 0))}%</span></span>
            <span className="city-tone-text mt-5 font-heading text-4xl leading-none sm:text-5xl">${Math.round(Number(l.percent_of_total ?? 0))}</span>
            <span className="mt-3 font-heading text-sm leading-snug text-foreground sm:text-base">{plainName(l)}</span>
            <span className="mt-2 text-xs text-muted-foreground">{money(l.amount)}</span>
          </Button>
          <div className="relative z-10 mt-3 space-y-1">{change(l)}<SourceLine url={l.source_url} verified={l.last_verified_at} />{reportLink(l)}</div>
        </section>)}
        <section style={{ "--tile-order": spend.length + 3 } as React.CSSProperties} className={`${tile} col-span-2`}>
          {selected ? <div className={tone(selectedIndex)}><div className="flex items-center gap-2"><i className="city-tone-bg size-3 rounded-full" /><h2 className="font-heading text-lg">{plainName(selected)}</h2></div><p className="mt-2 text-sm text-muted-foreground">This budget area is for {plainName(selected).toLowerCase()}. {isCounty ? "The county" : "The city"} calls it {selected.department_or_fund}. Ask UWAZI what the budget says it covers.</p><p className="my-2 text-sm text-foreground">Of every $100 {unit} spends, ${Math.round(Number(selected.percent_of_total ?? 0))} goes here.</p><div className="flex flex-wrap gap-2"><AskButton q={`What does ${selected.department_or_fund} in the ${city} budget pay for? Use the official budget source.`} label="Ask UWAZI what this pays for" /><Button size="sm" variant="outline" onClick={() => document.getElementById("city-budget-officials")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>Who decides</Button></div></div> : <p className="text-sm text-muted-foreground">Pick a spending area to see what it covers, in plain words, and who decides it.</p>}
        </section>
        {spend.some((l) => l.category) && <p className="col-span-2 text-xs text-muted-foreground lg:col-span-4">{isCounty ? "The county" : "The city"} groups its spending by {spend[0].category?.toLowerCase() ?? "area"}. Each one covers several departments.</p>}
      </>}
       {!preview && revenue.length > 0 && <><h2 className="col-span-2 mt-4 font-heading text-xl lg:col-span-4">Where the money comes from</h2>{revenue.slice(0, 3).map((l, i) => <section key={l.id} style={{ "--tile-order": spend.length + i + 5 } as React.CSSProperties} className={`${tile} ${tone(i)} ${i === 0 ? "col-span-2" : "col-span-1"}`}><h3 className="font-heading text-sm">{l.department_or_fund}</h3><p className="city-tone-text mt-3 font-heading text-[30px] leading-none">{money(l.amount)}</p><div className="mt-4 h-1.5 rounded-full bg-muted"><div className="city-bar-segment city-tone-bg h-full rounded-full" style={{ width: `${Math.min(100, l.amount / revenue[0].amount * 100)}%` }} /></div><p className="mt-3 text-xs text-muted-foreground">{l.category ? `Listed as ${l.category} in the budget.` : `This is money ${unit} lists in its budget.`}</p><div className="mt-3 space-y-1">{change(l)}<SourceLine url={l.source_url} verified={l.last_verified_at} />{reportLink(l)}</div></section>)}</>}
      {!preview && calendar.length > 0 && <section className={`${tile} col-span-2 lg:col-span-2`}><h2 className="font-heading text-lg">Budget calendar</h2><p className="mt-1 text-sm text-muted-foreground">These are the dates you can show up to.</p>{!nextUpcoming && <p className="mt-2 text-sm text-muted-foreground">This year's dates have passed. Next year's light up when {unit} posts them.</p>}<ul className="mt-4 grid grid-cols-3 gap-2">{calendar.map((m) => { const d = new Date(`${m.milestone_date}T12:00:00`); const next = nextUpcoming?.id === m.id; return <li key={m.id} className={`min-w-0 rounded-lg border p-2 ${next ? "border-primary bg-primary/10 text-primary" : "border-border"} ${m.milestone_date < today ? "text-muted-foreground" : ""}`}><span className="block text-[10px] font-bold uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</span><span className="font-heading text-xl">{d.getDate()}</span><p className="break-words text-xs">{MILESTONE[m.milestone] ?? m.milestone}{m.label ? `. ${m.label}` : ""}</p><SourceLine url={m.source_url} verified={m.last_verified_at} /></li>; })}</ul></section>}
      {!preview && (data?.offices.length ?? 0) > 0 && <section id="city-budget-officials" className={`${tile} col-span-2 lg:col-span-2`}><h2 className="font-heading text-lg">Who votes on the budget</h2><p className="mt-1 text-sm text-muted-foreground">{isCounty ? "The county legislature votes to adopt the budget each year. The county executive can sign or veto it." : "The mayor and city council vote to adopt the budget each year."}</p><ul className="mt-4 flex flex-wrap gap-2">{data?.offices.map((o) => <li key={o.id} className="max-w-full rounded-lg border border-border bg-secondary p-2 text-xs"><p className="font-medium text-foreground">{o.current_holder ?? "Seat not listed"}</p><p className="text-muted-foreground">{o.office_title}</p><SourceLine url={o.source_url} verified={o.last_verified_at} /></li>)}</ul></section>}
      <section className={`${tile} col-span-2 lg:col-span-4`}><p className="eyebrow">Your next step</p><p className="my-3 text-sm text-foreground">{nextUpcoming ? `The next budget date is ${day(nextUpcoming.milestone_date)}. You can go and share what matters to you.` : isCounty ? "You can tell your county legislator what matters to you in the next budget." : "You can tell your council member what matters to you in the next budget."}</p><AskButton q={`How can I speak up about the ${city} budget?`} label="Ask UWAZI how to speak up" /></section>
    </div>
    <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}><DialogContent><DialogHeader><DialogTitle>Report inaccurate info</DialogTitle><DialogDescription>{target ? `${target.department_or_fund}, ${target.fiscal_year}. We show ${money(target.amount)}.` : ""} Our team checks every report.</DialogDescription></DialogHeader><div className="space-y-3"><div className="space-y-1"><Label htmlFor="rv">The right amount, if you know it</Label><Input id="rv" value={value} onChange={(e) => setValue(e.target.value)} placeholder="For example 740000000" /></div><div className="space-y-1"><Label htmlFor="rn">What is wrong</Label><Input id="rn" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tell us what you saw" /></div></div><DialogFooter><Button onClick={send} disabled={sending || (!value.trim() && !note.trim())}>{sending ? "Sending" : "Send report"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
