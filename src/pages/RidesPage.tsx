import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import uwaziLogo from "@/assets/uwazi-app-wordmark.png";
import { RidesShell, GreenButton, InfoPanel, Chip, Toggle, fmtDay, fmtHour } from "@/components/rides/RidesUI";

type Day = { day: string; dow: number; kind: "early" | "election_day"; open: boolean };
type Hour = { hour: string; seats_left: number; too_soon: boolean; bookable: boolean };
type Site = { id: string; name: string; address: string; open: string; close: string; distance_mi: number | null };
type Avail = {
  days: Day[];
  sites?: Site[];
  hours?: Hour[];
  earliest_bookable: { day: string; hour: string } | null;
  funded_left: number;
  ride_line_phone: string | null;
  early_start: string;
  early_end: string;
  election_day: string;
};

const NEEDS = [
  ["wheelchair", "Wheelchair"],
  ["walker", "Walker"],
  ["service_animal", "Service animal"],
  ["child_seat", "Child seat"],
  ["extra_time", "Extra time"],
  ["language_help", "Language help"],
  ["other", "Other"],
] as const;

const FIELD_LABELS: Record<string, string> = {
  first_name_last_initial: "Please enter a first name and last initial, like Maria G.",
  phone: "Please enter a 10 digit mobile number.",
  pickup_address: "Please enter your street address.",
  zip: "Please enter a 5 digit ZIP code.",
  ride_day: "Please pick a day.",
  pickup_time: "Please pick a pickup hour.",
};

async function availability(zip?: string, ride_day?: string, address?: string, site_id?: string): Promise<Avail> {
  const a = address && address.trim().length >= 5 ? address.trim() : undefined;
  const { data, error } = await supabase.functions.invoke("get-ride-availability", { body: { zip, ride_day, address: a, site_id } });
  if (error) throw error;
  return data as Avail;
}

export default function RidesPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [avail, setAvail] = useState<Avail | null>(null);
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [kind, setKind] = useState<"early" | "election_day" | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [hours, setHours] = useState<Hour[] | null>(null);
  const [hour, setHour] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[] | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [ward, setWard] = useState("");
  const [precinct, setPrecinct] = useState("");
  const [noPrecinct, setNoPrecinct] = useState(false);
  const [roundTrip, setRoundTrip] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [textsOk, setTextsOk] = useState(true);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    availability().then(setAvail).catch(() => setAvail(null));
  }, []);

  useEffect(() => {
    if (step === 2 && /^\d{5}$/.test(zip)) availability(zip, undefined, address).then(setAvail).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, zip]);

  useEffect(() => {
    setSiteId(null);
    setSites(null);
  }, [day]);

  useEffect(() => {
    if (!day) return setHours(null);
    setHours(null);
    let live = true;
    availability(zip, day, address, siteId ?? undefined)
      .then((a) => {
        if (!live) return;
        const list = a.sites ?? [];
        setSites(list);
        if (list.length && (!siteId || !list.some((x) => x.id === siteId))) {
          setSiteId(list[0].id);
          return;
        }
        setHours(a.hours ?? []);
      })
      .catch(() => live && setHours([]));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, zip, siteId]);

  const site = sites?.find((x) => x.id === siteId) ?? null;

  const earlyOpen = avail?.days.some((d) => d.kind === "early" && d.open);
  const edOpen = avail?.days.some((d) => d.kind === "election_day" && d.open);
  const phoneLine = avail?.ride_line_phone;

  const canNext =
    step === 1 ? address.trim().length >= 5 && /^\d{5}$/.test(zip)
    : step === 2 ? !!day && !!hour
    : step === 3 ? /^[A-Za-z][A-Za-z'\- ]{0,40} [A-Za-z]\.?$/.test(name.trim()) && phone.replace(/\D/g, "").length >= 10
    : true;

  const send = async () => {
    setSending(true);
    setErrors({});
    setFormError(null);
    const body: Record<string, unknown> = {
      first_name_last_initial: name.trim(),
      phone,
      pickup_address: address.trim(),
      zip,
      ride_day: day,
      pickup_time: hour,
      round_trip: roundTrip,
      needs,
      texts_ok: textsOk,
      source: "web",
    };
    if (kind === "early" && siteId) body.destination_site_id = siteId;
    if (kind === "election_day" && !noPrecinct && ward && precinct) {
      body.ward = ward;
      body.precinct = precinct;
    }
    const { data, error } = await supabase.functions.invoke("create-ride-request", { body });
    setSending(false);
    if (error) {
      let msg = "We could not send your request. Please try again or call the ride line.";
      if (error instanceof FunctionsHttpError) {
        const j = await error.context.json().catch(() => null);
        if (j?.fields) {
          const e: Record<string, string> = {};
          for (const k of Object.keys(j.fields)) e[k] = FIELD_LABELS[k] ?? "Please check this answer.";
          setErrors(e);
        }
        if (j?.error) msg = j.error;
      }
      setFormError(msg);
      return;
    }
    nav(`/rides/card/${data.ride_code}`);
  };

  const steps = ["Where", "When", "Contact", "Review"];

  return (
    <RidesShell logo={uwaziLogo}>
      {step >= 1 && step <= 4 && (
        <div className="mb-6 flex gap-1.5" aria-label={`Step ${step} of 4`}>
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-[hsl(var(--rides-green))]" : "bg-[hsl(var(--rides-ink)/0.15)]"}`} />
          ))}
        </div>
      )}

      {step === 0 && (
        <section className="space-y-6">
          <h1 className="font-heading text-4xl leading-tight">Need a ride to vote?</h1>
          <p className="text-lg text-[hsl(var(--rides-ink)/0.8)]">We will drive you to your voting place and back home. It is free.</p>
          <ul className="space-y-4">
            {[
              ["Free round trip", "Rides by zTrip, paid for by this program."],
              ["Early voting or Election Day", "Oct 20 to Nov 2, or Tuesday, Nov 3."],
              ["Learn your rights on the way", "Eight quick questions while you ride."],
              ["Open to every voter", "No one will ask who you vote for."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--rides-green))]" />
                <span><b className="block">{t}</b><span className="text-sm text-[hsl(var(--rides-ink)/0.7)]">{d}</span></span>
              </li>
            ))}
          </ul>
          <GreenButton onClick={() => setStep(1)}>Request a ride</GreenButton>
          {phoneLine && (
            <a href={`tel:${phoneLine}`} className="block w-full rounded-xl border border-[hsl(var(--rides-ink)/0.25)] py-3.5 text-center font-semibold">
              Call a ride coordinator
            </a>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="space-y-5">
          <h1 className="font-heading text-3xl">Where should we pick you up?</h1>
          <p className="text-[hsl(var(--rides-ink)/0.75)]">Enter the address where the driver should meet you.</p>
          <Field label="Street address" error={errors.pickup_address}>
            <input className="rides-input" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="123 Main St, Kansas City" />
          </Field>
          <Field label="ZIP code" error={errors.zip}>
            <input className="rides-input" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" autoComplete="postal-code" placeholder="64106" />
          </Field>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-5">
          <h1 className="font-heading text-3xl">When do you want to go?</h1>
          <p className="text-sm text-[hsl(var(--rides-ink)/0.75)]">Rides run weekdays 11 AM to 6 PM and Saturdays 8 AM to noon. You may share the car with neighbors going to the same place.</p>
          <div className="grid grid-cols-2 gap-2">
            <Chip active={kind === "early"} disabled={!earlyOpen} onClick={() => { setKind("early"); setDay(null); setHour(null); }}>
              <b className="block">Early voting</b>
              <span className="text-xs">{earlyOpen ? "Oct 20 to Nov 2" : "Booking closed"}</span>
            </Chip>
            <Chip active={kind === "election_day"} disabled={!edOpen} onClick={() => { setKind("election_day"); setDay(avail!.election_day); setHour(null); }}>
              <b className="block">Election Day</b>
              <span className="text-xs">{edOpen ? "Tue, Nov 3" : "Booking closed"}</span>
            </Chip>
          </div>

          {kind === "early" && avail && <Calendar days={avail.days.filter((d) => d.kind === "early")} value={day} onPick={(d) => { setDay(d); setHour(null); }} />}

          {kind === "early" && day && sites && sites.length > 0 && (
            <div className="space-y-2" role="radiogroup" aria-label="Early voting place">
              <p className="font-semibold">Where do you want to vote early?</p>
              {sites.map((x) => (
                <button
                  key={x.id}
                  role="radio"
                  aria-checked={siteId === x.id}
                  onClick={() => { setSiteId(x.id); setHour(null); }}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
                    siteId === x.id ? "border-[hsl(var(--rides-green))] bg-[hsl(var(--rides-green)/0.1)]" : "border-[hsl(var(--rides-ink)/0.15)]"
                  }`}
                >
                  <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${siteId === x.id ? "border-[hsl(var(--rides-green))] bg-[hsl(var(--rides-green))]" : "border-[hsl(var(--rides-ink)/0.4)]"}`} />
                  <span className="min-w-0">
                    <b className="block">{x.name}</b>
                    <span className="block text-sm text-[hsl(var(--rides-ink)/0.75)]">{x.address}</span>
                    <span className="block text-xs text-[hsl(var(--rides-ink)/0.6)]">
                      {x.distance_mi != null ? `${x.distance_mi} miles away. ` : ""}Open {fmtHour(x.open)} to {fmtHour(x.close)}
                    </span>
                  </span>
                </button>
              ))}
              <p className="text-xs text-[hsl(var(--rides-ink)/0.6)]">Early voting is open to registered voters in Kansas City, Jackson County.</p>
            </div>
          )}

          {day && (
            <div className="space-y-2">
              <p className="font-semibold">Pickup time on {fmtDay(day)}</p>
              {!hours ? (
                <p className="text-sm text-[hsl(var(--rides-ink)/0.6)]">Checking open seats.</p>
              ) : hours.length === 0 ? (
                <p className="text-sm">No pickups that day. Pick another day.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {hours.map((h) => (
                    <Chip key={h.hour} active={hour === h.hour} disabled={!h.bookable} onClick={() => setHour(h.hour)}>
                      <b className="block">{fmtHour(h.hour)}</b>
                      <span className="text-xs">{h.too_soon ? "Too soon" : h.seats_left === 0 ? "Full" : `${h.seats_left} seats left`}</span>
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          )}

          <InfoPanel>
            {avail?.earliest_bookable
              ? <>Earliest pickup you can book: {fmtDay(avail.earliest_bookable.day)}, {fmtHour(avail.earliest_bookable.hour)}. </>
              : <>No pickups are open right now. </>}
            Need a ride sooner? {phoneLine ? <a className="underline" href={`tel:${phoneLine}`}>Call the ride line.</a> : "Call the ride line."}
          </InfoPanel>

          {kind === "election_day" && (
            <div className="space-y-2">
              <p className="font-semibold">Ward and precinct (on your voter card)</p>
              <p className="text-xs text-[hsl(var(--rides-ink)/0.6)]">This helps us find your polling place. It is optional.</p>
              {!noPrecinct && (
                <div className="grid grid-cols-2 gap-2">
                  <input className="rides-input" placeholder="Ward" inputMode="numeric" value={ward} onChange={(e) => setWard(e.target.value.replace(/\D/g, "").slice(0, 3))} />
                  <input className="rides-input" placeholder="Precinct" inputMode="numeric" value={precinct} onChange={(e) => setPrecinct(e.target.value.replace(/\D/g, "").slice(0, 3))} />
                </div>
              )}
              <Toggle checked={noPrecinct} onChange={setNoPrecinct} label="I don't know" />
            </div>
          )}

          <Toggle checked={roundTrip} onChange={setRoundTrip} label="Ride home too" />
        </section>
      )}

      {step === 3 && (
        <section className="space-y-5">
          <h1 className="font-heading text-3xl">How do we reach you?</h1>
          <p className="text-[hsl(var(--rides-ink)/0.75)]">We only use this to plan your ride.</p>
          <Field label="First name and last initial" error={errors.first_name_last_initial}>
            <input className="rides-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria G." autoComplete="off" />
          </Field>
          <Field label="Mobile number" error={errors.phone}>
            <input className="rides-input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="816 555 0100" />
          </Field>
          <div className="space-y-2">
            <p className="font-semibold">Anything the driver should know?</p>
            <div className="flex flex-wrap gap-2">
              {NEEDS.map(([k, l]) => (
                <Chip key={k} small active={needs.includes(k)} onClick={() => setNeeds((n) => (n.includes(k) ? n.filter((x) => x !== k) : [...n, k]))}>{l}</Chip>
              ))}
            </div>
          </div>
          <div>
            <Toggle checked={textsOk} onChange={setTextsOk} label="Text me ride updates" />
            <p className="mt-1 text-xs text-[hsl(var(--rides-ink)/0.6)]">Reply STOP any time.</p>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <h1 className="font-heading text-3xl">Check your ride</h1>
          <p className="text-[hsl(var(--rides-ink)/0.75)]">Make sure everything looks right. Then send it.</p>
          <Review label="Pickup" value={`${address}, ${zip}`} error={errors.pickup_address || errors.zip} onEdit={() => setStep(1)} />
          <Review
            label="When"
            value={`${day ? fmtDay(day) : ""}, ${hour ? fmtHour(hour) : ""}${roundTrip ? ". Round trip" : ". One way"}${kind === "election_day" && ward && precinct && !noPrecinct ? `. Ward ${ward}, precinct ${precinct}` : ""}${kind === "early" && site ? `. Vote at ${site.name}` : ""}`}
            error={errors.ride_day || errors.pickup_time}
            onEdit={() => setStep(2)}
          />
          <Review
            label="Contact"
            value={`${name}. ${phone}${needs.length ? `. ${needs.map((n) => NEEDS.find((x) => x[0] === n)?.[1]).join(", ")}` : ""}${textsOk ? ". Texts on" : ". No texts"}`}
            error={errors.first_name_last_initial || errors.phone}
            onEdit={() => setStep(3)}
          />
          {formError && <p role="alert" className="rounded-xl bg-destructive/20 p-3 text-sm">{formError}</p>}
          <GreenButton onClick={send} disabled={sending}>{sending ? "Sending" : "Send ride request"}</GreenButton>
        </section>
      )}

      {step >= 1 && step <= 3 && (
        <div className="mt-8 flex gap-3">
          <button className="rounded-xl border border-[hsl(var(--rides-ink)/0.25)] px-5 py-3.5 font-semibold" onClick={() => setStep(step - 1)}>Back</button>
          <GreenButton onClick={() => setStep(step + 1)} disabled={!canNext}>Next</GreenButton>
        </div>
      )}
      {step === 4 && (
        <button className="mt-3 w-full py-2 text-sm underline" onClick={() => setStep(3)}>Back</button>
      )}
    </RidesShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-semibold">{label}</span>
      {children}
      {error && <span role="alert" className="block text-sm text-destructive">{error}</span>}
    </label>
  );
}

function Review({ label, value, error, onEdit }: { label: string; value: string; error?: string; onEdit: () => void }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[hsl(var(--rides-ink)/0.6)]">{label}</p>
          <p className="mt-1">{value}</p>
        </div>
        <button className="text-sm font-semibold text-[hsl(var(--rides-green))]" onClick={onEdit}>Edit</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Calendar({ days, value, onPick }: { days: Day[]; value: string | null; onPick: (d: string) => void }) {
  const cells = useMemo(() => {
    if (!days.length) return [];
    const lead = days[0].dow;
    return [...Array(lead).fill(null), ...days] as (Day | null)[];
  }, [days]);
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[hsl(var(--rides-ink)/0.6)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const sunday = c.dow === 0;
          const n = Number(c.day.slice(8));
          return (
            <button
              key={c.day}
              disabled={!c.open}
              onClick={() => onPick(c.day)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${
                value === c.day
                  ? "bg-[hsl(var(--rides-green))] font-bold text-[hsl(var(--rides-bg))]"
                  : c.open ? "bg-[hsl(var(--rides-ink)/0.08)]" : "opacity-35"
              }`}
            >
              {n}
              {sunday && <span className="text-[9px] leading-none">No rides</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
