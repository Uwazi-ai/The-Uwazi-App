import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import uwaziLogo from "@/assets/uwazi-app-wordmark.png";
import { fmtDay, fmtHour, fmtPhone, telHref } from "@/components/rides/RidesUI";
import { RideDrawer } from "@/components/rides/desk/RideDrawer";
import { PhoneRequestForm } from "@/components/rides/desk/PhoneRequestForm";
import { CoordinatorsPanel } from "@/components/rides/desk/CoordinatorsPanel";
import { Link } from "react-router-dom";
import {
  FUNDED, NEED_LABELS, avgWait, driverCost, driverDays, fmtWait, reportCsv, tripGroups,
  type Block, type Ride, type Settings,
} from "@/components/rides/desk/deskLib";

const COLUMNS = [
  ["requested", "New requests"],
  ["booked", "Booked with zTrip"],
  ["riding", "On the way"],
  ["completed", "Completed"],
] as const;

const SEEN_KEY = "ride-desk-opened";
const tag = "rounded-full px-2 py-0.5 text-xs font-semibold";
const amber = `${tag} bg-[hsl(var(--rides-amber)/0.2)] text-[hsl(var(--rides-amber))]`;
const blue = `${tag} bg-[hsl(var(--rides-blue))]`;
const plain = `${tag} bg-[hsl(var(--rides-ink)/0.1)]`;

export default function RideDeskPage() {
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("is_ride_coordinator", { _user_id: user.id }).then(({ data }) => setAllowed(!!data));
  }, [user]);

  if (loading) return <Frame><p>Loading.</p></Frame>;
  if (!user) return <Navigate to="/login?next=/rides/desk" replace />;
  if (allowed === null) return <Frame><p>Loading.</p></Frame>;
  if (!allowed) return <Frame><h1 className="font-heading text-3xl">This page is for ride coordinators.</h1><p className="mt-3 text-[hsl(var(--rides-ink)/0.7)]">Ask a UWAZI admin if you need access.</p></Frame>;
  return <Desk />;
}

function AdminTools() {
  const { user } = useAuth();
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (user) supabase.rpc("is_admin", { _user_id: user.id }).then(({ data }) => setAdmin(!!data));
  }, [user]);
  if (!admin) return null;
  return (
    <>
      <Link to="/rides/desk/rights" className="mt-8 block rounded-2xl border border-[hsl(var(--rides-ink)/0.2)] p-4 font-semibold">Review rights questions</Link>
      <CoordinatorsPanel />
    </>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[hsl(var(--rides-bg))] text-[hsl(var(--rides-ink))]">
      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-[calc(var(--sat)+1rem)] md:px-6">
        <img src={uwaziLogo} alt="UWAZI.APP" className="mb-6 h-9 w-auto" />
        {children}
      </div>
    </main>
  );
}

function Desk() {
  const isMobile = useIsMobile();
  const [rides, setRides] = useState<Ride[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [siteDays, setSiteDays] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"phone" | "report" | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]")));
  const [now, setNow] = useState(Date.now());

  const [paused, setPaused] = useState<Set<string>>(new Set());
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ride_requests")
      .select("*, site:voter_guide_sites(id,name,address,hours,precinct_key)")
      .order("ride_day").order("pickup_time").order("created_at");
    setRides((data ?? []) as unknown as Ride[]);
    const { data: p } = await supabase.rpc("ride_paused_ids");
    setPaused(new Set(((p ?? []) as unknown as string[]).map(String)));
  }, []);

  useEffect(() => {
    load();
    supabase.from("ride_settings").select("*").eq("id", true).single().then(({ data }) => setSettings(data));
    supabase.from("driver_blocks").select("*").then(({ data }) => setBlocks(data ?? []));
    supabase.from("ride_site_hours").select("open_date").then(({ data }) => setSiteDays(new Set((data ?? []).map((r) => r.open_date))));
    const ch = supabase
      .channel(`ride-desk-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => load())
      .subscribe();
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [load]);

  const open = (id: string) => {
    setOpenId(id);
    setSeen((s) => {
      const n = new Set(s).add(id);
      localStorage.setItem(SEEN_KEY, JSON.stringify([...n]));
      return n;
    });
  };

  const fundedBooked = rides.filter((r) => FUNDED.includes(r.status)).length;
  const groups = useMemo(() => tripGroups(rides), [rides]);
  const current = rides.find((r) => r.id === openId) ?? null;
  const closed = rides.filter((r) => r.status === "referred" || r.status === "cancelled");

  if (!settings) return <Frame><p>Loading the ride desk.</p></Frame>;
  const cap = settings.funded_cap;

  const Card = ({ r }: { r: Ride }) => {
    const waiting = r.status === "requested" && now - new Date(r.created_at).getTime() > 30 * 60000;
    const fresh = !seen.has(r.id);
    return (
      <button
        onClick={() => open(r.id)}
        className={`w-full space-y-2 rounded-2xl border p-3 text-left transition hover:border-[hsl(var(--rides-ink)/0.4)] ${
          fresh ? "border-[hsl(var(--rides-green))] bg-[hsl(var(--rides-green)/0.12)]" : "border-[hsl(var(--rides-ink)/0.15)] bg-[hsl(var(--rides-ink)/0.04)]"
        }`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <b>{r.first_name_last_initial}</b>
          <span className="text-xs text-[hsl(var(--rides-ink)/0.6)]">{r.ride_code}</span>
        </div>
        <p className="text-sm">{fmtDay(r.ride_day)}, {fmtHour(r.pickup_time)}</p>
        <p className="text-sm text-[hsl(var(--rides-ink)/0.75)]">
          {r.site && !r.needs_destination ? r.site.name : <span className={amber}>Needs voting place</span>}
        </p>
        <div className="flex flex-wrap gap-1">
          <span className={plain}>{r.source === "phone" ? "Phone" : "Web"}</span>
          <span className={plain}>{r.round_trip ? "Round trip" : "One way"}</span>
          {r.needs.map((n) => <span key={n} className={blue}>{NEED_LABELS[n] ?? n}</span>)}
          {waiting && <span className={amber}>Waiting 30m</span>}
          {r.driver_name && <span className={plain}>Driver {r.driver_name}</span>}
          {paused.has(r.id) && <span className={amber}>Texts paused</span>}
          {r.quiz_finished_at && <span className={blue}>Rights quiz {Number(r.quiz_score)}/8</span>}
        </div>
      </button>
    );
  };

  const sheetSide = isMobile ? "bottom" : "right";
  const sheetCls = `border-[hsl(var(--rides-ink)/0.15)] bg-[hsl(var(--rides-bg))] text-[hsl(var(--rides-ink))] overflow-y-auto ${isMobile ? "max-h-[90dvh] rounded-t-3xl" : "w-full sm:max-w-md"}`;

  return (
    <Frame>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-4xl">Ride desk</h1>
          <p className="text-[hsl(var(--rides-ink)/0.7)]">Early voting Oct 20 to Nov 2. Election Day Nov 3.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPanel("phone")} className="rounded-xl bg-[hsl(var(--rides-green))] px-4 py-2.5 font-semibold text-[hsl(var(--rides-bg))]">Log a phone request</button>
          <button onClick={() => setPanel("report")} className="rounded-xl border border-[hsl(var(--rides-ink)/0.25)] px-4 py-2.5 font-semibold">WIP report</button>
        </div>
      </div>

      <section className="mt-6 grid gap-4 rounded-3xl bg-[hsl(var(--rides-ink)/0.05)] p-5 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <p className="font-heading text-4xl">{fundedBooked} of {cap}</p>
          <p className="text-sm text-[hsl(var(--rides-ink)/0.7)]">Funded round trips booked</p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[hsl(var(--rides-ink)/0.12)]">
            <div className="h-full rounded-full bg-[hsl(var(--rides-green))]" style={{ width: `${Math.min(100, (fundedBooked / Math.max(1, cap)) * 100)}%` }} />
          </div>
        </div>
        <Stat n={rides.filter((r) => r.status === "requested").length} l="Waiting to book" />
        <Stat n={rides.filter((r) => r.status === "completed").length} l="Trips completed" />
        <Stat n={fmtWait(avgWait(rides))} l="Average wait to book" />
      </section>

      <section className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {COLUMNS.map(([status, title]) => {
          const list = rides.filter((r) => r.status === status);
          return (
            <div key={status} className="w-[82vw] shrink-0 snap-start space-y-3 md:w-auto">
              <h2 className="flex justify-between font-semibold"><span>{title}</span><span className="text-[hsl(var(--rides-ink)/0.6)]">{list.length}</span></h2>
              {list.map((r) => <Card key={r.id} r={r} />)}
              {list.length === 0 && <p className="rounded-2xl border border-dashed border-[hsl(var(--rides-ink)/0.15)] p-4 text-sm text-[hsl(var(--rides-ink)/0.5)]">None right now.</p>}
            </div>
          );
        })}
      </section>

      <section className="mt-4">
        <button onClick={() => setShowClosed((v) => !v)} className="font-semibold underline">
          {showClosed ? "Hide" : "Show"} closed rides ({closed.length})
        </button>
        {showClosed && <div className="mt-3 grid gap-3 md:grid-cols-4">{closed.map((r) => <div key={r.id}><span className={plain}>{r.status === "referred" ? "Referred" : "Cancelled"}</span><div className="mt-1"><Card r={r} /></div></div>)}</div>}
      </section>

      <AdminTools />
      <Waitlist freed={closed.filter((r) => r.status === "cancelled").length} />


      <section className="mt-8">
        <h2 className="font-heading text-2xl">Trips to send zTrip</h2>
        <p className="mb-3 text-sm text-[hsl(var(--rides-ink)/0.7)]">Riders with the same day, hour and voting place share one trip.</p>
        {groups.length === 0 && <p className="text-sm">No active rides yet.</p>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <div key={g.key} className="space-y-2 rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-4">
              <p className="font-semibold">{fmtDay(g.day)}, {fmtHour(g.time)}</p>
              <p className="text-sm">{g.destId ? g.destName : <span className={amber}>Needs voting place</span>}</p>
              <p className="text-sm">{g.rides.length} of {settings.seats_per_slot} riders. {g.rides.length > 1 ? "One multi-pickup trip" : "Single pickup"}</p>
              <p className="text-sm text-[hsl(var(--rides-ink)/0.75)]">{g.rides.map((r) => r.first_name_last_initial).join(", ")}</p>
              {g.conflict && (
                <p className="rounded-xl bg-[hsl(var(--rides-amber)/0.15)] p-2 text-xs text-[hsl(var(--rides-amber))]">
                  Another trip leaves this same hour. With one driver, move a group or add a second driver at the full $40/hr.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <Sheet open={!!current} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side={sheetSide} className={sheetCls}>
          <SheetTitle className="sr-only">Ride details</SheetTitle>
          {current && paused.has(current.id) && (
            <p className="mb-3 mt-6 rounded-xl bg-[hsl(var(--rides-amber)/0.15)] p-3 text-sm text-[hsl(var(--rides-amber))]">
              Texts paused. This rider replied STOP. Call them instead. They can reply START to get texts again.
            </p>
          )}
          {current && <RideDrawer key={current.id + current.status + current.trip_stage + String(current.destination_site_id)} ride={current} settings={settings} fundedBooked={fundedBooked} onClose={() => setOpenId(null)} />}
        </SheetContent>
      </Sheet>

      <Sheet open={panel !== null} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent side={sheetSide} className={sheetCls}>
          <SheetTitle className="sr-only">{panel === "phone" ? "Log a phone request" : "WIP report"}</SheetTitle>
          {panel === "phone" && <PhoneRequestForm onDone={() => { setPanel(null); load(); }} />}
          {panel === "report" && <Report rides={rides} settings={settings} blocks={blocks} siteDays={siteDays} />}
        </SheetContent>
      </Sheet>
    </Frame>
  );
}

function Stat({ n, l }: { n: number | string; l: string }) {
  return (
    <div>
      <p className="font-heading text-3xl">{n}</p>
      <p className="text-sm text-[hsl(var(--rides-ink)/0.7)]">{l}</p>
    </div>
  );
}

function Report({ rides, settings, blocks, siteDays }: { rides: Ride[]; settings: Settings; blocks: Block[]; siteDays: Set<string> }) {
  const days = driverDays(settings, blocks, siteDays);
  const { hours, cost } = driverCost(days, Number(settings.driver_rate));
  const rows: [string, string | number][] = [
    ["Ride requests received", rides.length],
    ["Funded round trips booked", `${rides.filter((r) => FUNDED.includes(r.status)).length} of ${settings.funded_cap}`],
    ["Trips completed", rides.filter((r) => r.status === "completed").length],
    ["Requests by phone", rides.filter((r) => r.source === "phone").length],
    ["Riders with access needs", rides.filter((r) => r.needs.length > 0).length],
    ["Referred to RideKC", rides.filter((r) => r.status === "referred").length],
    ["Needs voting place", rides.filter((r) => r.needs_destination && !["cancelled", "referred"].includes(r.status)).length],
    ["Finished the rights quiz", rides.filter((r) => r.quiz_finished_at).length],
    ["Average wait to book", fmtWait(avgWait(rides))],
    ["Driver days scheduled", days.length],
    ["Estimated driver cost", `$${cost.toLocaleString()} for ${hours} hours at $${Number(settings.driver_rate)}/hr`],
  ];
  const download = () => {
    const url = URL.createObjectURL(new Blob([reportCsv(rides)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ride-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4 pb-8">
      <h2 className="font-heading text-2xl">WIP report</h2>
      <dl className="divide-y divide-[hsl(var(--rides-ink)/0.1)]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5 text-sm"><dt>{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
        ))}
      </dl>
      <p className="text-xs text-[hsl(var(--rides-ink)/0.55)]">Weekdays count 7 driver hours. Saturdays count 4. The CSV has no names, phones or addresses.</p>
      <button onClick={download} className="w-full rounded-xl bg-[hsl(var(--rides-green))] py-3 font-semibold text-[hsl(var(--rides-bg))]">Export CSV</button>
      <BirdEmailTest />
    </div>
  );
}

type WaitRow = { id: string; state_code: string | null; created_at: string; texted_at: string | null; texted_count: number; has_phone: boolean; has_account: boolean };

function Waitlist({ freed }: { freed: number }) {
  const [rows, setRows] = useState<WaitRow[]>([]);
  const [shown, setShown] = useState<Record<string, string | null>>({});
  useEffect(() => {
    const load = () => supabase.rpc("ride_waitlist_list").then(({ data }) => setRows((data ?? []) as WaitRow[]));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  const reveal = async (id: string) => {
    const { data } = await supabase.rpc("ride_waitlist_phone", { _id: id });
    setShown((s) => ({ ...s, [id]: data ? String(data) : null }));
  };
  return (
    <section className="mt-8">
      <h2 className="font-heading text-2xl">Waitlist</h2>
      <p className="mb-3 text-sm text-[hsl(var(--rides-ink)/0.7)]">
        {rows.length} people waiting. {freed > 0 ? `${freed} cancelled rides may have freed a seat. A super admin can text the waitlist from the admin Ride Desk.` : "Phones stay hidden until you open one."}
      </p>
      {rows.length === 0 ? <p className="text-sm">No one is waiting.</p> : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-2 rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-3 text-sm">
              <div>
                <p className="font-semibold">{w.state_code === "KS" ? "Kansas" : "Missouri"} <span className="font-normal text-[hsl(var(--rides-ink)/0.6)]">since {new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></p>
                <p className="text-xs text-[hsl(var(--rides-ink)/0.6)]">{w.texted_at ? `Texted ${new Date(w.texted_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Not texted yet"}{!w.has_phone && ". No phone"}</p>
              </div>
              {w.id in shown ? (shown[w.id] ? <a className="font-semibold underline" href={telHref(shown[w.id])}>{fmtPhone(shown[w.id])}</a> : <span>No phone saved</span>)
                : w.has_phone && <button onClick={() => reveal(w.id)} className="min-h-[44px] rounded-xl border border-[hsl(var(--rides-ink)/0.25)] px-3 font-semibold">Show phone</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BirdEmailTest() {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const send = async () => {
    setBusy(true); setOut(null);
    const { data, error } = await supabase.functions.invoke("bird-email-test", { body: {} });
    setBusy(false);
    if (error || !data || data.error) {
      let msg: string | undefined = data?.error;
      try { msg = msg ?? (await (error as { context?: Response })?.context?.json())?.error; } catch { /* ignore */ }
      return setOut(msg ?? "The test email did not send.");
    }
    setOut(`Sent. Id ${data.id}. Status ${data.status}.`);
  };
  return (
    <div className="space-y-2 border-t border-[hsl(var(--rides-ink)/0.1)] pt-4">
      <button onClick={send} disabled={busy} className="w-full rounded-xl border border-[hsl(var(--rides-ink)/0.25)] py-3 font-semibold disabled:opacity-40">{busy ? "Sending" : "Send Bird test email"}</button>
      {out && <p className="break-all text-sm">{out}</p>}
    </div>
  );
}
