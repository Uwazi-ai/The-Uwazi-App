import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fmtDay, fmtHour, fmtPhone, telHref } from "@/components/rides/RidesUI";
import { NEED_LABELS, type Ride, type RideEvent, type Settings, stageLabel } from "./deskLib";

type Option = { id: string; name: string; address: string; extra?: string };

const btn = "w-full rounded-xl py-3 font-semibold disabled:opacity-40";
const green = `${btn} bg-[hsl(var(--rides-green))] text-[hsl(var(--rides-bg))]`;
const ghost = `${btn} border border-[hsl(var(--rides-ink)/0.25)]`;

export function RideDrawer({ ride, settings, fundedBooked, onClose }: { ride: Ride; settings: Settings; fundedBooked: number; onClose: () => void }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<RideEvent[]>([]);
  const [ztrip, setZtrip] = useState(ride.ztrip_confirmation ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [options, setOptions] = useState<Option[] | null>(null);
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const isElection = ride.ride_day === settings.election_day;
  const hour = Number(ride.pickup_time.slice(0, 2));

  const loadEvents = () =>
    supabase.from("ride_events").select("*").eq("request_id", ride.id).order("created_at").then(({ data }) => setEvents(data ?? []));

  useEffect(() => {
    loadEvents();
    const ch = supabase
      .channel(`ride-events-${ride.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ride_events", filter: `request_id=eq.${ride.id}` }, loadEvents)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride.id]);

  // Destination options valid for this day and hour.
  useEffect(() => {
    if (!ride.needs_destination && ride.destination_site_id) return;
    let live = true;
    (async () => {
      if (!isElection) {
        const { data } = await supabase
          .from("ride_site_hours")
          .select("open_time,close_time,voter_guide_sites!inner(id,name,address,site_type,verification_status)")
          .eq("open_date", ride.ride_day)
          .eq("voter_guide_sites.site_type", "early")
          .eq("voter_guide_sites.verification_status", "verified");
        const at = `${String(hour).padStart(2, "0")}:00:00`;
        const after = `${String(hour + 1).padStart(2, "0")}:00:00`;
        const list = (data ?? [])
          .filter((r) => r.open_time <= at && r.close_time >= after)
          .map((r) => {
            const s = r.voter_guide_sites as unknown as Option;
            return { id: s.id, name: s.name, address: s.address, extra: `Open ${fmtHour(r.open_time)} to ${fmtHour(r.close_time)}` };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        if (live) setOptions(list);
      } else {
        const q = search.trim();
        if (q.length < 2) return live && setOptions([]);
        let query = supabase
          .from("voter_guide_sites")
          .select("id,name,address,precinct_key")
          .eq("site_type", "polling")
          .eq("verification_status", "verified")
          .eq("election_date", settings.election_day)
          .limit(25);
        const m = q.match(/^(\d{1,3})\s*[-\s/]\s*(\d{1,3})$/);
        query = m ? query.eq("precinct_key", `${Number(m[1])}-${Number(m[2])}`) : query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
        const { data } = await query;
        if (live) setOptions((data ?? []).map((s) => ({ id: s.id, name: s.name, address: s.address, extra: s.precinct_key ? `Ward and precinct ${s.precinct_key}` : undefined })));
      }
    })();
    return () => { live = false; };
  }, [ride.id, ride.needs_destination, ride.destination_site_id, isElection, search, hour, ride.ride_day, settings.election_day]);

  const log = (event_type: string, note: string) =>
    supabase.from("ride_events").insert({ request_id: ride.id, event_type, note, actor: user!.id });

  const run = async (fn: () => PromiseLike<{ error: unknown } | void>) => {
    setBusy(true);
    setErr(null);
    const r = await fn();
    setBusy(false);
    if (r && r.error) setErr("That did not save. Please try again.");
  };

  const update = (patch: Partial<Ride>) => supabase.from("ride_requests").update(patch).eq("id", ride.id);

  const assign = () =>
    run(async () => {
      const opt = options?.find((o) => o.id === pick);
      if (!opt) return;
      const r = await update({ destination_site_id: opt.id, needs_destination: false });
      if (!r.error) await log("destination_assigned", opt.name);
      setPick(null);
      return r;
    });

  const markBooked = () =>
    run(async () => {
      const z = ztrip.trim() || null;
      const r = await update({ status: "booked", ztrip_confirmation: z, trip_stage: 2 });
      if (!r.error && z) await log("ztrip_number", `zTrip ${z}`);
      return r;
    });

  const stage = (trip_stage: number, note: string, status?: string) =>
    run(async () => {
      const r = await update(status ? { status, trip_stage } : { trip_stage });
      if (!r.error) await log("trip_stage", note);
      return r;
    });

  const atCap = fundedBooked >= settings.funded_cap;
  const statusText: Record<string, string> = { requested: "New request", booked: "Booked with zTrip", riding: stageLabel(ride) ?? "On the way", completed: "Completed", referred: "Referred to RideKC", cancelled: "Cancelled" };

  return (
    <div className="space-y-5 pb-8 text-[hsl(var(--rides-ink))]">
      <div>
        <p className="text-xs uppercase tracking-widest text-[hsl(var(--rides-ink)/0.6)]">{ride.ride_code}. {statusText[ride.status] ?? ride.status}</p>
        <h2 className="font-heading text-2xl">{ride.first_name_last_initial}</h2>
        <p className="text-lg">{fmtDay(ride.ride_day)}, {fmtHour(ride.pickup_time)} pickup</p>
      </div>

      <dl className="space-y-3 text-sm">
        <Row k="Phone"><a className="underline" href={telHref(ride.phone)}>{fmtPhone(ride.phone)}</a>{ride.texts_ok ? ". Texts on" : ". No texts"}</Row>
        <Row k="Pickup">{ride.pickup_address}, {ride.zip}</Row>
        <Row k="Voting place">
          {ride.site && !ride.needs_destination ? (
            <>{ride.site.name}<br />{ride.site.address}{ride.site.hours && <><br /><span className="text-[hsl(var(--rides-ink)/0.65)]">{ride.site.hours}</span></>}</>
          ) : <span className="text-[hsl(var(--rides-amber))]">Needs voting place</span>}
        </Row>
        <Row k="Trip">{ride.round_trip ? "Round trip" : "One way"}. {ride.source === "phone" ? "Phone" : "Web"} request</Row>
        {ride.needs.length > 0 && <Row k="Needs">{ride.needs.map((n) => NEED_LABELS[n] ?? n).join(", ")}</Row>}
        {ride.ztrip_confirmation && <Row k="zTrip number">{ride.ztrip_confirmation}</Row>}
      </dl>

      {(ride.needs_destination || !ride.destination_site_id) && !["completed", "cancelled", "referred"].includes(ride.status) && (
        <section className="space-y-2 rounded-2xl border border-[hsl(var(--rides-amber)/0.5)] p-4">
          <h3 className="font-semibold">Assign voting place</h3>
          {isElection && (
            <input className="rides-input" placeholder="Ward and precinct like 12-3, or a name" value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
          {options === null ? <p className="text-sm">Loading places.</p> : options.length === 0 ? (
            <p className="text-sm text-[hsl(var(--rides-ink)/0.7)]">{isElection ? "Type a ward and precinct or a name." : "No early site is open at this hour. Change the pickup with the rider."}</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {options.map((o) => (
                <label key={o.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${pick === o.id ? "border-[hsl(var(--rides-green))]" : "border-[hsl(var(--rides-ink)/0.2)]"}`}>
                  <input type="radio" name="dest" checked={pick === o.id} onChange={() => setPick(o.id)} className="mt-1 accent-[hsl(var(--rides-green))]" />
                  <span><b>{o.name}</b><br />{o.address}{o.extra && <><br /><span className="text-[hsl(var(--rides-ink)/0.65)]">{o.extra}</span></>}</span>
                </label>
              ))}
            </div>
          )}
          <button className={green} disabled={!pick || busy} onClick={assign}>Save voting place</button>
        </section>
      )}

      <section className="space-y-3">
        {ride.status === "requested" && (
          atCap ? (
            <button className={green} disabled={busy} onClick={() => run(() => update({ status: "referred" }))}>Funded rides are full. Send RideKC info</button>
          ) : (
            <>
              <input className="rides-input" placeholder="zTrip number, optional" value={ztrip} onChange={(e) => setZtrip(e.target.value)} maxLength={40} />
              <button className={green} disabled={busy} onClick={markBooked}>Mark booked</button>
              <p className="text-xs text-[hsl(var(--rides-ink)/0.55)]">zTrip API booking comes in Sprint 2B.</p>
            </>
          )
        )}
        {ride.status === "booked" && <button className={green} disabled={busy} onClick={() => stage(3, "Picked up", "riding")}>Mark picked up</button>}
        {ride.status === "riding" && ride.trip_stage < 4 && <button className={green} disabled={busy} onClick={() => stage(4, "Dropped at voting place")}>Dropped at voting place</button>}
        {ride.status === "riding" && ride.trip_stage >= 4 && ride.trip_stage < 6 && ride.round_trip && (
          <button className={green} disabled={busy} onClick={() => stage(6, "Picked up for ride home")}>Picked up for ride home</button>
        )}
        {ride.status === "riding" && ((ride.trip_stage >= 6) || (ride.trip_stage >= 4 && !ride.round_trip)) && (
          <button className={green} disabled={busy} onClick={() => stage(7, "Trip complete", "completed")}>Mark trip complete</button>
        )}
        {ride.status === "requested" && (
          confirmCancel ? (
            <div className="space-y-2 rounded-xl border border-[hsl(var(--rides-ink)/0.25)] p-3">
              <p className="text-sm">Cancel this ride? The rider keeps their code but no driver comes.</p>
              <div className="flex gap-2">
                <button className={ghost} onClick={() => setConfirmCancel(false)}>Keep it</button>
                <button className={`${btn} bg-[hsl(var(--rides-amber))] text-[hsl(var(--rides-bg))]`} disabled={busy} onClick={() => run(() => update({ status: "cancelled" }))}>Yes, cancel</button>
              </div>
            </div>
          ) : <button className={ghost} onClick={() => setConfirmCancel(true)}>Cancel request</button>
        )}
        {err && <p className="text-sm text-[hsl(var(--rides-amber))]">{err}</p>}
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Trip log</h3>
        <ol className="space-y-2 border-l border-[hsl(var(--rides-ink)/0.2)] pl-4 text-sm">
          {events.map((e) => (
            <li key={e.id}>
              <span className="text-[hsl(var(--rides-ink)/0.55)]">{new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. </span>
              {e.event_type === "status_change" ? `Status ${e.from_status} to ${e.to_status}` : e.note ?? e.event_type}
            </li>
          ))}
          {events.length === 0 && <li>No events yet.</li>}
        </ol>
      </section>
      <button className={ghost} onClick={onClose}>Close</button>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="text-[hsl(var(--rides-ink)/0.6)]">{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}
