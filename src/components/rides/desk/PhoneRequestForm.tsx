import { useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Chip, Toggle, fmtDay, fmtHour } from "@/components/rides/RidesUI";
import { NEED_LABELS } from "./deskLib";

type Day = { day: string; kind: "early" | "election_day" };
type Hour = { hour: string; seats_left: number };
type Site = { id: string; name: string; address: string; open: string; close: string; distance_mi: number | null };

export function PhoneRequestForm({ onDone }: { onDone: (code: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [days, setDays] = useState<Day[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[] | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [hours, setHours] = useState<Hour[] | null>(null);
  const [hour, setHour] = useState<string | null>(null);
  const [ward, setWard] = useState("");
  const [precinct, setPrecinct] = useState("");
  const [roundTrip, setRoundTrip] = useState(true);
  const [needs, setNeeds] = useState<string[]>([]);
  const [textsOk, setTextsOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const avail = (body: Record<string, unknown>) => supabase.functions.invoke("get-ride-availability", { body });

  useEffect(() => {
    avail({}).then(({ data }) => setDays((data?.days ?? []).map((d: Day) => ({ day: d.day, kind: d.kind }))));
  }, []);

  useEffect(() => {
    setHour(null);
    setHours(null);
    if (!day || !/^\d{5}$/.test(zip)) return;
    let live = true;
    avail({ zip, ride_day: day, address: address.trim().length >= 5 ? address.trim() : undefined, site_id: siteId ?? undefined }).then(({ data }) => {
      if (!live) return;
      const list: Site[] = data?.sites ?? [];
      setSites(data?.sites ? list : null);
      if (list.length && (!siteId || !list.some((s) => s.id === siteId))) return setSiteId(list[0].id);
      setHours(data?.hours ?? []);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, zip, siteId]);

  const isElection = days.find((d) => d.day === day)?.kind === "election_day";
  const ok = /^[A-Za-z][A-Za-z'\- ]{0,40} [A-Za-z]\.?$/.test(name.trim()) && phone.replace(/\D/g, "").length >= 10 && address.trim().length >= 5 && /^\d{5}$/.test(zip) && day && hour;

  const send = async () => {
    setBusy(true);
    setErr(null);
    const body: Record<string, unknown> = {
      first_name_last_initial: name.trim(), phone, pickup_address: address.trim(), zip,
      ride_day: day, pickup_time: hour, round_trip: roundTrip, needs, texts_ok: textsOk,
    };
    if (!isElection && siteId) body.destination_site_id = siteId;
    if (isElection && ward && precinct) { body.ward = ward; body.precinct = precinct; }
    const { data, error } = await supabase.functions.invoke("create-phone-ride", { body });
    setBusy(false);
    if (error) {
      let msg = "That did not save. Please try again.";
      if (error instanceof FunctionsHttpError) {
        const j = await error.context.json().catch(() => null);
        if (j?.fields) msg = `Please check: ${Object.keys(j.fields).join(", ").replace(/_/g, " ")}.`;
        else if (j?.error) msg = j.error;
      }
      return setErr(msg);
    }
    onDone(data.ride_code);
  };

  const label = "mb-1 block text-sm font-semibold";
  return (
    <div className="space-y-4 pb-8 text-[hsl(var(--rides-ink))]">
      <h2 className="font-heading text-2xl">Log a phone request</h2>
      <p className="text-sm text-[hsl(var(--rides-ink)/0.7)]">Last minute pickups are fine here.</p>
      <div><span className={label}>First name and last initial</span><input className="rides-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria G." /></div>
      <div><span className={label}>Mobile number</span><input className="rides-input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="816 555 0100" /></div>
      <div><span className={label}>Pickup street address</span><input className="rides-input" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
      <div><span className={label}>ZIP</span><input className="rides-input" inputMode="numeric" maxLength={5} value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))} /></div>
      <div>
        <span className={label}>Day</span>
        <select className="rides-input" value={day ?? ""} onChange={(e) => { setSiteId(null); setDay(e.target.value || null); }}>
          <option value="">Pick a day</option>
          {days.map((d) => <option key={d.day} value={d.day}>{fmtDay(d.day)}{d.kind === "election_day" ? ". Election Day" : ""}</option>)}
        </select>
      </div>
      {sites && (
        <div className="space-y-2">
          <span className={label}>Where do they want to vote early?</span>
          {sites.length === 0 && <p className="text-sm">No early site is open that day.</p>}
          {sites.map((s) => (
            <Chip key={s.id} active={siteId === s.id} onClick={() => setSiteId(s.id)}>
              <b className="block">{s.name}</b>
              <span className="text-sm">{s.address}{s.distance_mi != null ? `. ${s.distance_mi} mi` : ""}. {fmtHour(s.open)} to {fmtHour(s.close)}</span>
            </Chip>
          ))}
        </div>
      )}
      {day && (
        <div>
          <span className={label}>Pickup hour</span>
          {!/^\d{5}$/.test(zip) ? <p className="text-sm">Enter the ZIP first.</p> : hours === null ? <p className="text-sm">Loading hours.</p> : hours.length === 0 ? <p className="text-sm">No pickups that day.</p> : (
            <div className="flex flex-wrap gap-2">
              {hours.map((h) => (
                <Chip key={h.hour} small active={hour === h.hour} disabled={h.seats_left <= 0} onClick={() => setHour(h.hour)}>
                  {fmtHour(h.hour)} {h.seats_left > 0 ? `${h.seats_left} left` : "Full"}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}
      {isElection && (
        <div className="grid grid-cols-2 gap-2">
          <div><span className={label}>Ward, optional</span><input className="rides-input" inputMode="numeric" value={ward} onChange={(e) => setWard(e.target.value.replace(/\D/g, ""))} /></div>
          <div><span className={label}>Precinct, optional</span><input className="rides-input" inputMode="numeric" value={precinct} onChange={(e) => setPrecinct(e.target.value.replace(/\D/g, ""))} /></div>
        </div>
      )}
      <Toggle checked={roundTrip} onChange={setRoundTrip} label="Ride home too" />
      <div className="flex flex-wrap gap-2">
        {Object.entries(NEED_LABELS).map(([k, l]) => (
          <Chip key={k} small active={needs.includes(k)} onClick={() => setNeeds((n) => (n.includes(k) ? n.filter((x) => x !== k) : [...n, k]))}>{l}</Chip>
        ))}
      </div>
      <Toggle checked={textsOk} onChange={setTextsOk} label="Text them ride updates" />
      {err && <p className="text-sm text-[hsl(var(--rides-amber))]">{err}</p>}
      <button className="w-full rounded-xl bg-[hsl(var(--rides-green))] py-3 font-semibold text-[hsl(var(--rides-bg))] disabled:opacity-40" disabled={!ok || busy} onClick={send}>
        {busy ? "Saving" : "Save phone request"}
      </button>
    </div>
  );
}
