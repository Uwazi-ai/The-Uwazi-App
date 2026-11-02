import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Phone } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fmtHour, fmtPhone, telHref } from "@/components/rides/RidesUI";
import { todayPrefix } from "../../../../../supabase/functions/_shared/ride-cutoff";
import { PauseSwitch } from "../PauseSwitch";
import { groupMessage, signature, smsHref } from "../ztripText";
import type { Ride, ServiceDay, Settings } from "../deskLib";
import {
  capacity, deskTitle, freedSeats, minutesSince, minutesTo, newWebRequests, noticeTitle, notSent, openStandby, queue, standbyNoticeTitle, todayCentral,
  type AdminAction, type DeskEvent, type StandbyRow,
} from "./edayLib";

const RIDE_LINE = "(816) 379-6885";
const POLL_MS = 15000;
const HANDLED_KEY = "ride-desk-eday-unhandled";
const btn = "inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold disabled:opacity-40";
const green = `${btn} bg-[hsl(var(--rides-green))] text-[hsl(var(--rides-bg))]`;
const ghost = `${btn} border border-[hsl(var(--rides-ink)/0.25)]`;
const chip = "rounded-full px-2 py-0.5 text-xs font-semibold";
type Conn = "live" | "reconnecting" | "polling";

// Short two tone chime. Web Audio only, no audio files.
function chime(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.2, t + i * 0.15 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.15 + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.15);
      o.stop(t + i * 0.15 + 0.32);
    });
  } catch { /* sound is optional */ }
}

function notify(title: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(title, { tag: title });
  } catch { /* notifications are optional */ }
}

export function EdayPanel({ rides, loaded, settings, onSettings, svcDays, onOpen, onChanged }: {
  rides: Ride[]; loaded: boolean; settings: Settings; onSettings: (s: Settings) => void; svcDays: ServiceDay[]; onOpen: (id: string) => void; onChanged: () => void;
}) {
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());
  const day = todayCentral(now);
  const [events, setEvents] = useState<DeskEvent[]>([]);
  const [standby, setStandby] = useState<StandbyRow[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [conn, setConn] = useState<Conn>("reconnecting");
  const [alertsOn, setAlertsOn] = useState(false);
  const [unhandled, setUnhandled] = useState<string[]>(() => JSON.parse(sessionStorage.getItem(HANDLED_KEY) ?? "[]"));
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [seatOpen, setSeatOpen] = useState<{ key: string; time: string }[]>([]);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const alertsRef = useRef(false);
  const known = useRef<Set<string> | null>(null);
  const knownStandby = useRef<Set<string> | null>(null);
  const prevStatus = useRef<Map<string, string>>(new Map());
  const seenNoShow = useRef<Set<string> | null>(null);
  alertsRef.current = alertsOn;

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  useEffect(() => { sessionStorage.setItem(HANDLED_KEY, JSON.stringify(unhandled)); }, [unhandled]);

  const todays = useMemo(() => queue(rides, day), [rides, day]);
  const ids = useMemo(() => todays.map((r) => r.id), [todays]);
  const idKey = ids.join(",");

  const loadEvents = useCallback(async () => {
    if (!idKey) return setEvents([]);
    const { data } = await supabase.from("ride_events").select("request_id,event_type,created_at").in("request_id", idKey.split(",")).in("event_type", ["ztrip_texted", "ztrip_emailed", "no_show"]);
    setEvents((data ?? []) as DeskEvent[]);
  }, [idKey]);
  const loadStandby = useCallback(async () => {
    const [w, a] = await Promise.all([
      supabase.from("poll_ride_waitlist").select("id,name_initial,time_window,phone,requested_date,created_at").eq("reason", "standby").eq("requested_date", day),
      supabase.from("ride_admin_log").select("target_id,action").in("action", ["standby_called", "standby_removed"]),
    ]);
    setStandby((w.data ?? []) as StandbyRow[]);
    setActions((a.data ?? []) as AdminAction[]);
  }, [day]);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { loadStandby(); }, [loadStandby]);

  const refreshAll = useCallback(() => { onChanged(); loadStandby(); loadEvents(); }, [onChanged, loadStandby, loadEvents]);
  const refreshRef = useRef(refreshAll);
  refreshRef.current = refreshAll;

  // Live updates with the signed in session, so RLS limits rows to coordinators.
  useEffect(() => {
    let lost: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase
      .channel(`eday-desk-${Math.random().toString(36).slice(2, 10)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ride_requests" }, () => refreshRef.current())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ride_requests" }, () => refreshRef.current())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "poll_ride_waitlist" }, () => refreshRef.current())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ride_events" }, () => refreshRef.current())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { if (lost) clearTimeout(lost); lost = null; setConn("live"); refreshRef.current(); return; }
        setConn((c) => (c === "polling" ? c : "reconnecting"));
        if (!lost) lost = setTimeout(() => setConn((c) => (c === "live" ? c : "polling")), 8000);
      });
    // If the channel never connects, fall back to polling.
    lost = setTimeout(() => setConn((c) => (c === "live" ? c : "polling")), 10000);
    return () => { if (lost) clearTimeout(lost); supabase.removeChannel(ch); };
  }, []);
  useEffect(() => {
    if (conn === "live") return;
    const t = setInterval(() => refreshRef.current(), POLL_MS);
    return () => clearInterval(t);
  }, [conn]);

  // New web requests: chime, notice, title, banner. Deduped by ride id.
  useEffect(() => {
    if (!loaded) return;
    if (!known.current) { known.current = new Set(rides.map((r) => r.id)); return; }
    const fresh = newWebRequests(rides, known.current, day);
    rides.forEach((r) => known.current!.add(r.id));
    if (!fresh.length) return;
    setUnhandled((u) => [...u, ...fresh.map((r) => r.id).filter((id) => !u.includes(id))]);
    if (alertsRef.current) { chime(audio.current); fresh.forEach((r) => notify(noticeTitle(r))); }
  }, [rides, loaded, day]);

  // New standby signups chime too. Deduped by row id.
  useEffect(() => {
    if (!knownStandby.current) { knownStandby.current = new Set(standby.map((w) => w.id)); return; }
    const fresh = standby.filter((w) => !knownStandby.current!.has(w.id));
    standby.forEach((w) => knownStandby.current!.add(w.id));
    if (fresh.length && alertsRef.current) { chime(audio.current); notify(standbyNoticeTitle()); }
  }, [standby]);

  // Seat open when a ride for today is cancelled or marked no-show.
  useEffect(() => {
    if (!loaded) return;
    if (!seenNoShow.current) {
      seenNoShow.current = new Set(events.filter((e) => e.event_type === "no_show").map((e) => e.request_id));
    } else {
      const freed = freedSeats(prevStatus.current, rides, events, seenNoShow.current, day);
      events.filter((e) => e.event_type === "no_show").forEach((e) => seenNoShow.current!.add(e.request_id));
      if (freed.length) setSeatOpen((s) => [...s, ...freed.filter((r) => !s.some((x) => x.key === r.id)).map((r) => ({ key: r.id, time: r.pickup_time }))]);
    }
    prevStatus.current = new Map(rides.map((r) => [r.id, r.status]));
  }, [rides, events, loaded, day]);

  // Tab title carries only a count.
  useEffect(() => {
    if (!alertsOn) return;
    // While alerts are on, this panel owns the title so Today's calls does not overwrite it.
    document.documentElement.dataset.edayTitle = "1";
    document.title = deskTitle(unhandled.length);
  }, [alertsOn, unhandled.length]);
  useEffect(() => () => { delete document.documentElement.dataset.edayTitle; document.title = "Ride desk"; }, []);

  const turnOnAlerts = async () => {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC && !audio.current) audio.current = new AC();
      await audio.current?.resume?.();
    } catch { /* sound is optional */ }
    try { if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission(); } catch { /* optional */ }
    setAlertsOn(true);
    chime(audio.current);
  };

  const handle = (id: string) => setUnhandled((u) => u.filter((x) => x !== id));
  const sendText = (r: Ride) => supabase.functions.invoke("send-ride-text", { body: { ride_id: r.id, kind: r.status === "cancelled" ? "cancelled" : "booked" } });
  const act = async (key: string, fn: () => Promise<{ error: unknown } | void>) => {
    setBusy(key); setNote("");
    const r = await fn();
    if (r && r.error) setNote("That did not save. Try again.");
    setBusy(null);
    refreshAll();
  };
  const markTexted = (r: Ride) => act(`t${r.id}`, async () => {
    const res = await supabase.from("ride_events").insert({ request_id: r.id, event_type: "ztrip_texted", note: signature(r), actor: user?.id });
    return res;
  });
  const markBooked = (r: Ride) => { handle(r.id); return act(`b${r.id}`, async () => {
    const res = await supabase.from("ride_requests").update({ status: "booked", trip_stage: 0 }).eq("id", r.id);
    if (!res.error) await sendText({ ...r, status: "booked" });
    return res;
  }); };
  const cancelRide = (r: Ride) => { handle(r.id); return act(`c${r.id}`, async () => {
    const res = await supabase.from("ride_requests").update({ status: "cancelled" }).eq("id", r.id);
    if (!res.error) await sendText({ ...r, status: "cancelled" });
    return res;
  }); };
  const logStandby = (id: string, action: "standby_called" | "standby_removed") => act(`s${id}${action}`, async () =>
    await supabase.from("ride_admin_log").insert({ action, target_id: id, actor: user?.id }));

  const svc = svcDays.find((d) => d.service_date === day);
  const cap = capacity(rides, svc?.wave_times ?? [], day, settings.seats_per_slot, settings.requests_paused === true, now);
  const open = openStandby(standby, actions, day);
  const called = new Set(actions.filter((a) => a.action === "standby_called").map((a) => a.target_id));
  const nextStandby = open.find((w) => !called.has(w.id));
  const newest = [...unhandled].reverse().map((id) => rides.find((r) => r.id === id)).find(Boolean) ?? null;
  const cancelRideRow = rides.find((r) => r.id === cancelId) ?? null;
  const dot = { live: ["bg-[hsl(var(--rides-green))]", "Live"], reconnecting: ["bg-[hsl(var(--rides-amber))]", "Reconnecting"], polling: ["bg-[hsl(var(--rides-ink)/0.4)]", "Polling"] }[conn];

  const RideActions = ({ r }: { r: Ride }) => (
    <div className="flex flex-wrap gap-2">
      <a href={smsHref(settings.ztrip_text_phone, groupMessage([r]))} onClick={() => handle(r.id)} className={green}>Text zTrip</a>
      <button type="button" className={ghost} disabled={busy === `t${r.id}`} onClick={() => markTexted(r)}>Mark texted</button>
      {r.status === "requested" && <button type="button" className={ghost} disabled={busy === `b${r.id}`} onClick={() => markBooked(r)}>Mark booked</button>}
      <button type="button" className={ghost} onClick={() => { handle(r.id); onOpen(r.id); }}>Open ride</button>
      {["requested", "booked"].includes(r.status) && <button type="button" className={ghost} onClick={() => setCancelId(r.id)}>Cancel ride</button>}
    </div>
  );

  return (
    <section aria-labelledby="eday-heading" data-eday-panel className="min-w-0 rounded-3xl border-2 border-[hsl(var(--rides-green))] p-4 md:p-5">
      {seatOpen.map((s) => (
        <div key={s.key} role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[hsl(var(--rides-amber)/0.15)] p-3">
          <p className="font-semibold text-[hsl(var(--rides-amber))]">
            Seat open at {fmtHour(s.time)}. {nextStandby ? <>Call standby: {nextStandby.name_initial ?? "Standby rider"}, {nextStandby.time_window ?? "any time"}</> : "No one is on standby."}
          </p>
          <div className="flex flex-wrap gap-2">
            {nextStandby && <a className={green} href={telHref(nextStandby.phone)}><Phone className="mr-1 h-4 w-4" />Call</a>}
            {nextStandby && <button type="button" className={ghost} onClick={() => { logStandby(nextStandby.id, "standby_called"); setSeatOpen((x) => x.filter((y) => y.key !== s.key)); }}>Called</button>}
            <button type="button" className={ghost} onClick={() => setSeatOpen((x) => x.filter((y) => y.key !== s.key))}>Dismiss</button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="eday-heading" className="font-heading text-2xl">Election Day desk</h2>
          <p className="text-sm text-[hsl(var(--rides-ink)/0.7)]">Ride line <a className="underline" href={telHref(RIDE_LINE)}>{RIDE_LINE}</a>. zTrip text {fmtPhone(settings.ztrip_text_phone)}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span role="status" data-conn={conn} className="inline-flex items-center gap-1.5 text-sm"><span aria-hidden className={`h-2.5 w-2.5 rounded-full ${dot[0]}`} />{dot[1]}</span>
          {alertsOn
            ? <span className="text-sm font-semibold text-[hsl(var(--rides-green))]">Sound and alerts on</span>
            : <button type="button" className={ghost} onClick={turnOnAlerts}><Bell className="mr-1 h-4 w-4" />Turn on sound and alerts</button>}
        </div>
      </div>
      <div className="mt-3"><PauseSwitch settings={settings} onSettings={onSettings} idSuffix="-eday" /></div>

      {newest && (
        <div role="alert" data-new-banner className="mt-3 space-y-2 rounded-2xl bg-[hsl(var(--rides-green)/0.15)] p-3">
          <p className="font-semibold">New ride request {newest.ride_code}, {fmtHour(newest.pickup_time)}{unhandled.length > 1 ? `. ${unhandled.length} new in all.` : "."}</p>
          <RideActions r={newest} />
        </div>
      )}
      {note && <p role="alert" className="mt-2 text-sm text-destructive">{note}</p>}

      <h3 className="mt-4 font-semibold">Capacity today. <span data-capacity-total>{cap.label}</span></h3>
      {!svc && <p className="text-sm text-[hsl(var(--rides-ink)/0.6)]">No service day is set for today.</p>}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {cap.tiles.map((t) => (
          <div key={t.time} data-wave={t.time} className="rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-3">
            <p className="font-semibold">{fmtHour(t.time)}</p>
            <p className="text-sm">{t.booked} of {t.seats} seats</p>
            <p className={`text-xs font-semibold ${t.state === "Open" ? "text-[hsl(var(--rides-green))]" : "text-[hsl(var(--rides-amber))]"}`}>{t.state}</p>
            <p className="text-xs text-[hsl(var(--rides-ink)/0.6)]">{t.minutes >= 0 ? `In ${t.minutes} min` : `${-t.minutes} min ago`}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-5 font-semibold">Live queue ({todays.length})</h3>
      {todays.length === 0 && <p className="text-sm text-[hsl(var(--rides-ink)/0.6)]">No rides for today yet.</p>}
      <ul className="mt-2 space-y-2">
        {todays.map((r) => {
          const late = notSent(r, events, now);
          return (
            <li key={r.id} data-queue-row={r.ride_code} className={`space-y-2 rounded-2xl border p-3 ${unhandled.includes(r.id) ? "border-[hsl(var(--rides-green))]" : "border-[hsl(var(--rides-ink)/0.15)]"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p><b>{r.ride_code}</b> {r.first_name_last_initial} <a className="ml-1 text-sm text-primary underline" href={telHref(r.phone)}>Call</a></p>
                <p className="text-sm">{fmtHour(r.pickup_time)} <span className={`${chip} bg-[hsl(var(--rides-ink)/0.1)]`}>{r.status}</span></p>
              </div>
              <p className="text-xs text-[hsl(var(--rides-ink)/0.7)]">Requested {minutesSince(r.created_at, now)} min ago. {(() => { const m = minutesTo(r.ride_day, r.pickup_time, now); return m >= 0 ? `Pickup in ${m} min.` : `Pickup was ${-m} min ago.`; })()}</p>
              <div className="flex flex-wrap gap-1">
                {r.source === "phone" && <span className={`${chip} bg-[hsl(var(--rides-ink)/0.1)]`}>Phone</span>}
                {r.needs.includes("wheelchair") && <span className={`${chip} bg-[hsl(var(--rides-blue))]`}>Wheelchair</span>}
                {r.needs_destination && <span className={`${chip} bg-[hsl(var(--rides-amber)/0.2)] text-[hsl(var(--rides-amber))]`}>Needs voting place</span>}
                {todayPrefix(r.created_at, r.ride_day, r.pickup_time) && <span className={`${chip} bg-[hsl(var(--rides-green)/0.2)]`}>TODAY</span>}
                {late && <span data-not-sent className={`${chip} bg-destructive text-destructive-foreground`}>Not sent to zTrip</span>}
              </div>
              {r.status !== "cancelled" && r.status !== "completed" && <RideActions r={r} />}
            </li>
          );
        })}
      </ul>

      <h3 className="mt-5 font-semibold">Standby ({open.length})</h3>
      {open.length === 0 && <p className="text-sm text-[hsl(var(--rides-ink)/0.6)]">No one is on standby.</p>}
      <ul className="mt-2 space-y-2">
        {open.map((w) => (
          <li key={w.id} data-standby-row className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-3">
            <p><b>{w.name_initial ?? "Standby rider"}</b>, {w.time_window ?? "any time"} {called.has(w.id) && <span className={`${chip} bg-[hsl(var(--rides-ink)/0.1)]`}>Called</span>}</p>
            <div className="flex flex-wrap gap-2">
              {shown[w.id]
                ? <a className={green} href={telHref(w.phone)}>{fmtPhone(w.phone)}</a>
                : <button type="button" className={green} onClick={() => setShown((s) => ({ ...s, [w.id]: true }))}><Phone className="mr-1 h-4 w-4" />Tap to call</button>}
              <button type="button" className={ghost} onClick={() => logStandby(w.id, "standby_called")}>Called</button>
              <button type="button" className={ghost} onClick={() => logStandby(w.id, "standby_removed")}>Remove</button>
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog open={!!cancelRideRow} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel ride {cancelRideRow?.ride_code}?</AlertDialogTitle>
            <AlertDialogDescription>This frees the seat. Tell zTrip if they already have this ride.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep ride</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (cancelRideRow) cancelRide(cancelRideRow); setCancelId(null); }}>Yes, cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
