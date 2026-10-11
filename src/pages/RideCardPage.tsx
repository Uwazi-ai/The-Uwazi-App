import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import uwaziLogo from "@/assets/uwazi-app-wordmark.png";
import { RidesShell, InfoPanel, fmtDay, fmtHour } from "@/components/rides/RidesUI";

type Card = {
  ride_code: string;
  ride_day: string;
  pickup_time: string;
  round_trip: boolean;
  status: string;
  trip_stage: number;
  destination: { name: string; address: string } | null;
  needs_destination: boolean;
  referred: boolean;
  ride_line_phone: string | null;
};

const STATUS: Record<string, string> = {
  requested: "Booking your driver",
  booked: "Driver booked",
  riding: "On the way",
  completed: "Trip complete",
  cancelled: "Cancelled",
  referred: "Referred to RideKC",
};

function downloadIcs(c: Card) {
  const [y, m, d] = c.ride_day.split("-");
  const hh = c.pickup_time.slice(0, 2);
  const start = `${y}${m}${d}T${hh}0000`;
  const end = `${y}${m}${d}T${String(Number(hh) + 1).padStart(2, "0")}0000`;
  const where = c.destination ? `${c.destination.name}, ${c.destination.address}` : "Your voting place";
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//UWAZI//Rides//EN", "BEGIN:VEVENT",
    `UID:${c.ride_code}@uwazi.app`,
    `DTSTART;TZID=America/Chicago:${start}`,
    `DTEND;TZID=America/Chicago:${end}`,
    `SUMMARY:${esc(`Ride to vote ${c.ride_code}`)}`,
    `LOCATION:${esc(where)}`,
    `DESCRIPTION:${esc(`Ride code ${c.ride_code}. Bring a photo ID.`)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${c.ride_code}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RideCardPage() {
  const { code = "" } = useParams();
  const [card, setCard] = useState<Card | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase.functions.invoke("get-ride-card", { body: { ride_code: code } });
      if (!alive) return;
      if (error) setErr(true);
      else { setCard(data as Card); setErr(false); }
    };
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [code]);

  if (err && !card) {
    return (
      <RidesShell logo={uwaziLogo}>
        <h1 className="font-heading text-3xl">We could not find that ride.</h1>
        <p className="mt-3">Check your ride code and try again.</p>
        <Link to="/rides" className="mt-6 block rounded-xl bg-[hsl(var(--rides-green))] py-3.5 text-center font-semibold text-[hsl(var(--rides-bg))]">Request a ride</Link>
      </RidesShell>
    );
  }
  if (!card) {
    return <RidesShell logo={uwaziLogo}><p>Loading your ride.</p></RidesShell>;
  }

  const line = card.ride_line_phone;
  const LineLink = () => (line ? <a className="underline" href={`tel:${line}`}>Call the ride line.</a> : <>Call the ride line.</>);

  return (
    <RidesShell logo={uwaziLogo}>
      <div className="relative overflow-hidden rounded-3xl bg-[hsl(var(--rides-green))] text-[hsl(var(--rides-bg))]">
        <div className="p-6">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
            <span>Ride to vote</span><span>zTrip</span>
          </div>
          <p className="mt-4 font-heading text-6xl leading-none">{fmtHour(card.pickup_time)}</p>
          <p className="mt-2 text-lg font-semibold">{fmtDay(card.ride_day)}{card.round_trip ? ". Round trip" : ""}</p>
          <div className="mt-5 flex gap-3">
            <div className="flex flex-col items-center pt-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--rides-bg))]" />
              <span className="my-1 w-0.5 flex-1 bg-[hsl(var(--rides-bg)/0.5)]" />
              <span className="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--rides-bg))]" />
            </div>
            <div className="space-y-3">
              <p className="font-semibold">Your address</p>
              {card.referred ? (
                <p>Our funded rides are full. RideKC can get you there.</p>
              ) : card.needs_destination ? (
                <p>We are confirming your voting place. A coordinator will text you.</p>
              ) : (
                <div><p className="font-semibold">{card.destination!.name}</p><p className="text-sm">{card.destination!.address}</p></div>
              )}
            </div>
          </div>
        </div>
        <div className="relative h-0">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[hsl(var(--rides-bg))]" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[hsl(var(--rides-bg))]" />
          <div className="mx-5 border-t-2 border-dashed border-[hsl(var(--rides-bg)/0.4)]" />
        </div>
        <div className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs uppercase tracking-widest">Ride code</p>
            <p className="font-heading text-2xl">{card.ride_code}</p>
          </div>
          <span className="rounded-full bg-[hsl(var(--rides-bg))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--rides-green))]">{STATUS[card.status] ?? card.status}</span>
        </div>
      </div>

      {card.referred && (
        <div className="mt-4"><InfoPanel>
          RideKC can take you to vote. <a className="font-semibold underline" href="https://ridekc.org" target="_blank" rel="noreferrer">Visit ridekc.org</a>. Questions? <LineLink />
        </InfoPanel></div>
      )}

      <ul className="mt-6 space-y-3">
        <li className="rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-4"><b>Bring a photo ID.</b> Missouri and Kansas both ask for one.</li>
        <li className="rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-4"><b>Show this card to your driver.</b></li>
        <li className="rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-4"><b>Need to change your ride?</b> <LineLink /></li>
      </ul>

      <Link to="/app/ask" className="mt-4 block"><InfoPanel>
        <b className="block">Questions about your ballot?</b>
        Ask UWAZI what is on it before you go.
      </InfoPanel></Link>

      <button onClick={() => downloadIcs(card)} className="mt-4 w-full rounded-xl bg-[hsl(var(--rides-green))] py-3.5 font-semibold text-[hsl(var(--rides-bg))]">
        Add to my calendar
      </button>
    </RidesShell>
  );
}
