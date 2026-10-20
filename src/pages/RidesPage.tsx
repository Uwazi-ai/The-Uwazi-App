import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { RideRequestView } from "@/components/rides/RideRequestView";
import { useJoinRideWaitlist } from "@/hooks/useVotingRights";


type Day = { day: string; dow: number; kind: "early" | "election_day"; open: boolean; status?: "open" | "full" | "no_driver" | "closed"; note?: string | null };
type Hour = { hour: string; seats_left: number; too_soon: boolean; bookable: boolean };
type Site = { id: string; name: string; address: string; open: string; close: string; distance_mi: number | null };
type Avail = {
  sms_live: boolean;
  days: Day[];
  sites?: Site[];
  hours?: Hour[];
  earliest_bookable: { day: string; hour: string } | null;
  seats_left?: number;
  ride_line_phone: string | null;
  early_start: string;
  early_end: string;
  election_day: string;
};

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



  // Unmet demand: a day with no driver, or a full day. Never books a ride.
  const { join } = useJoinRideWaitlist();
  const [listDay, setListDay] = useState<Day | null>(null);
  const [listPhone, setListPhone] = useState("");
  const [listMsg, setListMsg] = useState<string | null>(null);
  const [listDone, setListDone] = useState<Set<string>>(new Set());
  const joinDay = async () => {
    if (!listDay) return;
    setListMsg(null);
    const res = await join({ phone: listPhone, state: "MO", address: address.trim(), zip, requested_date: listDay.day, reason: listDay.status === "full" ? "full" : "no_driver" });
    if (!res.ok) return setListMsg(res.error ?? "Something went wrong. Try again.");
    setListDone((d) => new Set(d).add(listDay.day));
    setListMsg("You are on the list for this day.");
  };



  // Area check runs on the server before any day is shown.
  const [areaError, setAreaError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [areaEligible, setAreaEligible] = useState(false);
  const checkArea = async () => {
    setChecking(true);
    setAreaError(null);
    const { data, error } = await supabase.functions.invoke("get-ride-availability", { body: { zip, address: address.trim() } });
    setChecking(false);
    if (error) {
      let msg = "We could not check your address. Please call the ride line at (816) 379-6885.";
      if (error instanceof FunctionsHttpError) {
        const j = await error.context.json().catch(() => null);
        if (j?.error) msg = j.error;
      }
      return setAreaError(msg);
    }
    if (data?.eligibility !== "eligible") return setAreaError(data?.eligibility_message ?? "We could not check your address. Please call the ride line at (816) 379-6885 to book.");
    setAvail(data as Avail);
    setAreaEligible(true);
  };
  const canNext =
    step === 1 ? address.trim().length >= 5 && /^\d{5}$/.test(zip) && !checking
    : step === 2 ? !!day && !!hour
    : step === 4 ? /^[A-Za-z][A-Za-z'\- ]{0,40} [A-Za-z]\.?$/.test(name.trim()) && phone.replace(/\D/g, "").length >= 10
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
      texts_ok: avail?.sms_live === true && textsOk,
      source: "web",
    };
    if (kind === "early" && siteId) body.destination_site_id = siteId;
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
    nav(`/rides/card/${data.ride_code}?t=${encodeURIComponent(data.card_token)}`);
  };

  const data = avail as (Avail & { election_day_place?: { name:string;address:string }; precinct_key?:string }) | null;
  return <RidesAppShell><RideRequestView smsLive={avail?.sms_live === true} step={step} address={address} zip={zip} name={name} phone={phone} needs={needs} textsOk={textsOk} roundTrip={roundTrip} kind={kind} day={day} hour={hour} siteId={siteId} days={avail?.days??[]} sites={sites??[]} hours={hours} pollingPlace={data?.election_day_place} precinct={data?.precinct_key} eligible={areaEligible} checking={checking} sending={sending} error={areaError??formError??Object.values(errors)[0]} canNext={canNext}
    onStep={setStep} onAddress={v=>{setAddress(v);setAreaEligible(false);setAreaError(null);}} onZip={v=>{setZip(v);setAreaEligible(false);setAreaError(null);}} onName={setName} onPhone={setPhone} onNeeds={setNeeds} onTexts={setTextsOk} onRoundTrip={setRoundTrip}
    onKind={k=>{setKind(k);setListDay(null);setDay(k==='election_day'?avail?.election_day??null:null);setHour(null);}} onDay={d=>{setListMsg(null);setHour(null);if(d.open){setListDay(null);setDay(d.day);}else{setDay(null);setListDay(d);}}} onSite={id=>{setSiteId(id);setHour(null);}} onHour={setHour}
    onContinue={()=>{if(step===1&&!areaEligible){void checkArea();return;}setStep(step===2?4:step+1);}} onSend={()=>void send()} listDay={listDay} listPhone={listPhone} listMessage={listMsg} listDone={listDay?listDone.has(listDay.day):false} onListPhone={setListPhone} onJoinList={()=>void joinDay()}/></RidesAppShell>;
}
