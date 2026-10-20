import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fmtDay, fmtHour, fmtPhone, telHref } from "@/components/rides/RidesUI";
import type { Ride } from "./deskLib";
import { ZtripTextButton } from "./ZtripTextButton";
import { EmailReminderAction } from "./EmailReminderAction";
import { ZtripEmailed } from './ZtripEmailed';
import { batches, groupMessage, homeBatches, homeMessage, updateMessage, zState, type ZEvent } from "./ztripText";

const ELECTION_DAY = "2026-11-03";
const EVENT_TYPES = ["late_called", "no_show", "confirmed_by_call", "call_no_answer", "place_confirmed", "cancelled", "ztrip_texted", "ride_home_texted", "rider_ready_for_return", "trip_stage", "rider_email_sent", "ztrip_emailed"];
type Ev = ZEvent;
type Wait = { id: string; requested_date: string; reason: string | null; phone: string };
type Item = { key: string; ride?: Ride; wait?: Wait; reason: string; script?: string; ztrip?: { rides: Ride[]; message: string; update: boolean; eventType?: string }; actions: [string, () => Promise<unknown> | void][] };

function chicago(ms: number) {
  const d = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(n));
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
  return { today: d(ms), tomorrow: d(ms + 86400000), minutes: Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) };
}

// Coordinator call list built from existing ride data. Every action writes a ride_events row.
export function TodaysCalls({ rides, now, ztripPhone, onOpen, onChanged }: { rides: Ride[]; now: number; ztripPhone: string; onOpen: (id: string) => void; onChanged: () => void }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Ev[]>([]);
  const [waits, setWaits] = useState<Wait[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [e, w] = await Promise.all([
      supabase.from("ride_events").select("request_id,event_type,note,created_at").in("event_type", EVENT_TYPES).order("created_at"),
      supabase.rpc("ride_waitlist_calls_due"),
    ]);
    setEvents((e.data ?? []) as Ev[]);
    setWaits((w.data ?? []) as Wait[]);
  }, []);
  useEffect(() => { load(); }, [load, rides]);
  // Refresh every 20 seconds without a page reload.
  useEffect(() => { const t = setInterval(() => { load(); onChanged(); }, 20000); return () => clearInterval(t); }, [load, onChanged]);

  const log = async (ride: Ride, event_type: string, patch?: Partial<Ride>) => {
    if (patch) { const r = await supabase.from("ride_requests").update(patch).eq("id", ride.id); if (r.error) return; }
    await supabase.from("ride_events").insert({ request_id: ride.id, event_type, actor: user?.id, ...(patch?.status ? { from_status: ride.status, to_status: patch.status } : {}) });
    await load(); onChanged();
  };

  const items = useMemo(() => {
    const c = chicago(now);
    const has = (id: string, t: string) => events.some((e) => e.request_id === id && e.event_type === t);
    const last = (id: string, t: string) => events.filter((e) => e.request_id === id && e.event_type === t).at(-1);
    const live = rides.filter((r) => !["cancelled", "referred", "completed"].includes(r.status));
    const place = (r: Ride) => r.site && !r.needs_destination ? r.site.name : "your voting place";
    const soon = (r: Ride) => r.ride_day === c.today || r.ride_day === c.tomorrow;
    const fresh = batches(rides.filter((r) => soon(r) && zState(r, events) === "new"));
    const changed = rides.filter((r) => r.ride_day >= c.today && zState(r, events) === "update");
    const groups: [string, Item[]][] = [
      ["Ride home ready", homeBatches(rides, events).map((b) => ({ key: "home" + b.key, ride: b.rides.length === 1 ? b.rides[0] : undefined, reason: b.rides.length > 1 ? `${b.rides.length} riders ready at ${b.rides[0].site?.name ?? "the voting place"}: ${b.rides.map((r) => r.ride_code).join(", ")}.` : "Ready for the ride home now.", ztrip: { rides: b.rides, message: homeMessage(b.rides), update: false, eventType: "ride_home_texted" }, actions: [] as Item["actions"] }))],
      ["Tell zTrip", [
        ...changed.map((r) => ({ key: "zu" + r.id, ride: r, reason: r.status === "cancelled" ? "Cancelled after zTrip was told." : "Changed after zTrip was told.", ztrip: { rides: [r], message: updateMessage(r), update: true }, actions: [] as Item["actions"] })),
        ...fresh.map((b) => ({ key: "zn" + b.key, ride: b.rides.length === 1 ? b.rides[0] : undefined, reason: b.rides.length > 1 ? `Group trip. ${b.rides.length} riders: ${b.rides.map((r) => r.ride_code).join(", ")}.` : "New trip for zTrip to watch.", ztrip: { rides: b.rides, message: groupMessage(b.rides), update: false }, actions: [] as Item["actions"] })),
      ]],
      ["Late or no-show watch", live.filter((r) => {
        if (r.ride_day !== c.today || r.picked_up_at || (r.trip_stage ?? 0) >= 3 || !r.pickup_time) return false;
        const [h, m] = r.pickup_time.split(":").map(Number);
        return c.minutes - (h * 60 + m) >= 15 && !has(r.id, "late_called") && !has(r.id, "no_show");
      }).map((r) => ({ key: "late" + r.id, ride: r, reason: `Pickup was ${fmtHour(r.pickup_time)}. Not picked up yet.`, actions: [["Called", () => log(r, "late_called")], ["Mark no-show", () => log(r, "no_show")], ["Open ride", () => onOpen(r.id)]] }))],
      ["Needs voting place", live.filter((r) => r.needs_destination).map((r) => ({ key: "dest" + r.id, ride: r, reason: "No voting place yet.", actions: [["Assign voting place", () => onOpen(r.id)]] }))],
      ["Confirm tomorrow's rides", live.filter((r) => ["booked", "requested"].includes(r.status) && r.ride_day === c.tomorrow && !has(r.id, "confirmed_by_call") && !((x) => x && now - Date.parse(x.created_at) < 2 * 3600000)(last(r.id, "call_no_answer"))).map((r) => ({
        key: "tmrw" + r.id, ride: r, reason: "Ride is tomorrow. Confirm by phone.",
        script: `Your ride is tomorrow at ${fmtHour(r.pickup_time)} to ${place(r)}. Does that still work?`,
        actions: [["Confirmed", () => log(r, "confirmed_by_call")], ["No answer", () => log(r, "call_no_answer")], ["Cancel ride", () => log(r, "cancelled", { status: "cancelled" })]],
      }))],
      ["Election Day, confirm voting place", live.filter((r) => r.ride_day === ELECTION_DAY && r.site && !r.needs_destination && !has(r.id, "place_confirmed")).map((r) => ({
        key: "eday" + r.id, ride: r, reason: "Check the voting place with the rider.",
        script: `Your voting place is ${r.site!.name}, ${r.site!.address}. Does that match your voter card?`,
        actions: [["Matches", () => log(r, "place_confirmed")], ["Different", () => onOpen(r.id)]],
      }))],
      ["Waiting to book", live.filter((r) => r.status === "requested" && now - Date.parse(r.created_at) > 30 * 60000).map((r) => ({ key: "wait" + r.id, ride: r, reason: "Requested over 30 minutes ago.", actions: [["Open ride", () => onOpen(r.id)]] }))],
      ["Waitlist", waits.map((w) => ({ key: "wl" + w.id, wait: w, reason: `A seat opened on ${fmtDay(w.requested_date)}.`, actions: [["Called", async () => { await supabase.from("ride_waitlist_calls").insert({ waitlist_id: w.id, actor: user!.id }); await load(); }]] }))],
    ];
    return groups.filter(([, list]) => list.length);
  }, [rides, events, waits, now]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = items.reduce((n, [, l]) => n + l.length, 0);
  useEffect(() => { document.title = count ? `(${count}) Ride desk` : "Ride desk"; }, [count]);
  const btn = "min-h-[44px] rounded-xl px-3 text-sm font-semibold disabled:opacity-40";
  return (
    <section aria-labelledby="todays-calls" className="mb-6 rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-4">
      <h2 id="todays-calls" className="flex items-center gap-2 font-heading text-2xl">Today's calls <span aria-label={`${count} items`} className="rounded-full bg-[hsl(var(--rides-green))] px-2.5 py-0.5 font-sans text-sm font-bold text-[hsl(var(--rides-bg))]">{count}</span></h2>
      {count === 0 ? <p className="mt-2 text-sm">Nothing to do right now.</p> : items.map(([title, list]) => (
        <div key={title} className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--rides-ink)/0.7)]">{title} ({list.length})</h3>
          <ul className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {list.map((it) => {
              const phone = it.ride?.phone ?? it.wait?.phone;
              return (
                <li key={it.key} data-call-item={title} className="space-y-2 rounded-xl bg-[hsl(var(--rides-ink)/0.06)] p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <b>{it.ride?.first_name_last_initial ?? (it.key.startsWith("home") ? "Ride home group" : it.ztrip ? "Group trip" : "Waitlist rider")}</b>
                    {it.ride && <span className="font-mono text-xs">{it.ride.ride_code}</span>}
                  </div>
                  {phone && <a className="inline-flex min-h-[44px] items-center font-semibold underline" href={telHref(phone)}>{fmtPhone(phone)}</a>}
                  <p>{it.reason}</p>
                  {title === 'Tell zTrip' && it.ztrip?.rides.map(r => <div key={r.id}><ZtripEmailed events={events} rideId={r.id} /></div>)}
                  {it.script && <p className="rounded-lg bg-[hsl(var(--rides-blue)/0.25)] p-2">Say: "{it.script}"</p>}
                  {it.ztrip && <ZtripTextButton rides={it.ztrip.rides} message={it.ztrip.message} phone={ztripPhone} update={it.ztrip.update} eventType={it.ztrip.eventType} onMarked={() => { load(); }} />}
                  {title === "Confirm tomorrow's rides" && it.ride && <EmailReminderAction
                    ride={{ id: it.ride.id, ride_day: it.ride.ride_day, status: it.ride.status, hasEmail: Boolean(it.ride.email) }}
                    now={now} sent={events.some(e => e.request_id === it.ride?.id && e.event_type === 'rider_email_sent' && e.note === 'reminder')}
                    onChanged={() => { load(); onChanged(); }} />}
                  <div className="flex flex-wrap gap-2">
                    {it.actions.map(([label, fn], i) => (
                      <button key={label} disabled={busy === it.key} className={`${btn} ${i === 0 ? "bg-[hsl(var(--rides-green))] text-[hsl(var(--rides-bg))]" : "border border-[hsl(var(--rides-ink)/0.25)]"}`} onClick={async () => { setBusy(it.key); try { await fn(); } finally { setBusy(null); } }}>{label}</button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
