import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import uwaziLogo from "@/assets/uwazi-app-wordmark.png";
import { RidesShell, InfoPanel, GreenButton, fmtPhone, telHref } from "@/components/rides/RidesUI";

type Card = {
  ride_code: string;
  round_trip: boolean;
  status: string;
  trip_stage: number;
  destination: { name: string; address: string; state: string } | null;
  ride_line_phone: string | null;
};
type Q = { id: string; sort: number; question: string; options: string[]; correct_index: number; title: string; explanation: string; takeaway: string };

const STAGES: [string, string][] = [
  ["Driver booked", "zTrip texts you when your driver leaves."],
  ["Your driver is on the way", "Get ready. Bring your photo ID."],
  ["Your driver is here", "Look for your zTrip car."],
  ["Riding to the voting place", "You have a few minutes. Learn your rights below."],
  ["You are at the voting place", "Go vote. Tap the button when you are ready to go home."],
  ["Your ride home is on the way", "Wait near the door. Your driver is coming."],
  ["Riding home", "Sit back. You voted."],
  ["Trip complete", "Thanks for riding. Share the ride line with a neighbor."],
];

function stageOf(c: Card) {
  if (c.status === "completed") return 7;
  return Math.min(c.trip_stage, 7);
}

function MapCard({ stage }: { stage: number }) {
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const moving = [1, 3, 5, 6].includes(stage);
  const home = stage >= 5;
  const path = "M50 120 C 120 30, 220 150, 290 50";
  return (
    <div className="overflow-hidden rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] bg-[hsl(var(--rides-ink)/0.04)]">
      <svg viewBox="0 0 340 170" className="h-auto w-full" role="img" aria-label="Map from your address to the voting place">
        <path d={path} fill="none" stroke="hsl(var(--rides-ink) / 0.35)" strokeWidth="4" strokeDasharray="8 8" strokeLinecap="round" />
        <g transform="translate(50 120)">
          <path d="M0 0 C -12 -16, -12 -30, 0 -30 C 12 -30, 12 -16, 0 0 Z" fill="hsl(var(--rides-blue))" />
          <circle cy="-20" r="4" fill="hsl(var(--rides-ink))" />
          <text y="18" textAnchor="middle" fontSize="12" fill="hsl(var(--rides-ink))" fontWeight="700">You</text>
        </g>
        <g transform="translate(290 50)">
          <rect x="-10" y="-10" width="20" height="20" rx="3" fill="hsl(var(--rides-green))" />
          <text y="28" textAnchor="middle" fontSize="12" fill="hsl(var(--rides-ink))" fontWeight="700">Vote</text>
        </g>
        {moving && (
          <g transform={reduce ? `translate(${home ? "290 50" : "50 120"})` : undefined}>
            <circle r="9" fill="hsl(var(--rides-ink))" />
            <circle r="5" fill="hsl(var(--rides-green))" />
            {!reduce && <animateMotion dur="6s" repeatCount="indefinite" path={path} keyPoints={home ? "1;0" : "0;1"} keyTimes="0;1" calcMode="linear" />}
          </g>
        )}
      </svg>
    </div>
  );
}

function Quiz({ qs, code, token, done }: { qs: Q[]; code: string; token: string; done: boolean }) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() => qs.map(() => null));
  const [finished, setFinished] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const q = qs[i];
  const pick = picks[i];
  const score = picks.filter((p, k) => p === qs[k].correct_index).length;

  const next = async () => {
    if (i < qs.length - 1) return setI(i + 1);
    setFinished(true);
    const { error } = await supabase.functions.invoke("rider-finish-quiz", { body: { ride_code: code, t: token, score } });
    setSaveErr(!!error);
  };
  const again = () => { setPicks(qs.map(() => null)); setI(0); setFinished(false); };

  if (finished) {
    return (
      <div className="space-y-4 rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-5">
        <p className="font-heading text-5xl">{score} of {qs.length}</p>
        <p className="font-semibold">You are ready. Here is your rights card for inside.</p>
        <ul className="list-disc space-y-1.5 pl-5">{qs.map((x) => <li key={x.id}>{x.takeaway}</li>)}</ul>
        {saveErr && <p className="text-sm text-[hsl(var(--rides-amber))]">We could not save your score. Your rights card still works.</p>}
        <button onClick={again} className="w-full rounded-xl border border-[hsl(var(--rides-ink)/0.25)] py-3 font-semibold">Take it again</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-5">
      <div className="flex gap-1.5" aria-label={`Question ${i + 1} of ${qs.length}`}>
        {qs.map((x, k) => {
          const p = picks[k];
          const c = k === i && p == null ? "bg-[hsl(var(--rides-ink))]" : p == null ? "bg-[hsl(var(--rides-ink)/0.2)]" : p === x.correct_index ? "bg-[hsl(var(--rides-green))]" : "bg-[hsl(var(--rides-amber))]";
          return <span key={x.id} className={`h-2.5 w-2.5 rounded-full ${c}`} />;
        })}
      </div>
      {done && i === 0 && pick == null && <p className="text-sm text-[hsl(var(--rides-ink)/0.65)]">You finished this before. Take it again any time.</p>}
      <p className="text-lg font-semibold">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((o, k) => {
          const chosen = pick === k;
          const right = k === q.correct_index;
          const cls = pick == null ? "border-[hsl(var(--rides-ink)/0.2)]"
            : right ? "border-[hsl(var(--rides-green))] bg-[hsl(var(--rides-green)/0.15)]"
            : chosen ? "border-[hsl(var(--rides-amber))] bg-[hsl(var(--rides-amber)/0.15)]" : "border-[hsl(var(--rides-ink)/0.1)] opacity-60";
          return (
            <button key={k} disabled={pick != null} onClick={() => setPicks((p) => p.map((v, j) => (j === i ? k : v)))} className={`w-full rounded-xl border p-3 text-left ${cls}`}>
              {o}{pick != null && right ? ". Right answer" : chosen ? ". Your pick" : ""}
            </button>
          );
        })}
      </div>
      {pick != null && (
        <>
          <InfoPanel>
            <b className="block">{pick === q.correct_index ? "Right." : "Good to know."} {q.title}</b>
            {q.explanation}
          </InfoPanel>
          <GreenButton onClick={next}>{i < qs.length - 1 ? "Next question" : "See my score"}</GreenButton>
        </>
      )}
    </div>
  );
}

export default function RideTrackPage() {
  const { code = "" } = useParams();
  const [sp] = useSearchParams();
  const token = sp.get("t") ?? "";
  const [card, setCard] = useState<Card & { quiz_finished?: boolean } | null>(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);
  const [qs, setQs] = useState<Q[] | null>(null);
  const [ask, setAsk] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("get-ride-card", { body: { ride_code: code, t: token } });
    if (error) setErr(true);
    else { setCard(data); setErr(false); }
  }, [code, token]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const state = card?.destination?.state ?? "MO";
  useEffect(() => {
    if (!card) return;
    supabase.from("rights_questions").select("id,sort,question,options,correct_index,title,explanation,takeaway")
      .eq("state", state).not("approved_at", "is", null).order("sort")
      .then(({ data }) => setQs((data as Q[]) ?? []));
  }, [state, !!card]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action: "in_car" | "ready_home") => {
    setBusy(true); setActErr(null);
    const { error } = await supabase.functions.invoke("rider-update-stage", { body: { ride_code: code, t: token, action } });
    setBusy(false);
    if (error) setActErr("That did not save. Please try again or call the ride line.");
    await load();
  };

  if (err && !card) {
    return (
      <RidesShell logo={uwaziLogo}>
        <h1 className="font-heading text-3xl">Ride not found</h1>
        <p className="mt-3">Open the full link from your ride text, or call the ride line.</p>
        <Link to="/rides" className="mt-6 block rounded-xl bg-[hsl(var(--rides-green))] py-3.5 text-center font-semibold text-[hsl(var(--rides-bg))]">Request a ride</Link>
      </RidesShell>
    );
  }
  if (!card) return <RidesShell logo={uwaziLogo}><p>Loading your ride.</p></RidesShell>;

  const notYet = card.status === "requested" || card.status === "referred" || card.status === "cancelled";
  const stage = stageOf(card);
  const oneWayDone = !card.round_trip && card.status === "completed";
  const [title, line] = notYet ? ["Not booked yet", "We will text you when your driver is booked."] : STAGES[stage];
  const total = card.round_trip ? 8 : 5;
  const filled = card.status === "completed" ? total : stage + 1;
  const phone = card.ride_line_phone;
  const byTopic = (sort: number) => qs?.find((q) => q.sort === sort);
  const chips: [string, number | null][] = [["What ID works?", 1], ["What if I'm not on the list?", 3], ["What time do polls close?", 4]];

  return (
    <RidesShell logo={uwaziLogo}>
      <Link to={`/rides/card/${card.ride_code}?t=${encodeURIComponent(token)}`} className="text-sm underline">Back to my ride card</Link>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[hsl(var(--rides-green))]">{card.ride_code}</p>
      <h1 className="mt-1 font-heading text-4xl leading-tight">{oneWayDone ? "Trip complete" : title}</h1>
      <p className="mt-2">{oneWayDone ? STAGES[7][1] : line}</p>

      <div className="mt-5 flex gap-1" aria-label={`Step ${Math.min(filled, total)} of ${total}`}>
        {Array.from({ length: total }).map((_, k) => (
          <span key={k} className={`h-1.5 flex-1 rounded-full ${k < filled && !notYet ? "bg-[hsl(var(--rides-green))]" : "bg-[hsl(var(--rides-ink)/0.2)]"}`} />
        ))}
      </div>

      <div className="mt-5"><MapCard stage={notYet ? 0 : stage} /></div>
      {card.destination && <p className="mt-2 text-sm"><b>{card.destination.name}</b>. {card.destination.address}</p>}

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-[hsl(var(--rides-ink)/0.15)] p-4">
        <div><p className="font-semibold">Your zTrip driver</p><p className="text-sm text-[hsl(var(--rides-ink)/0.65)]">Questions about pickup? Call us.</p></div>
        {phone && <a href={telHref(phone)} className="rounded-xl bg-[hsl(var(--rides-green))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--rides-bg))]" aria-label={`Call ride line ${fmtPhone(phone)}`}>Call ride line</a>}
      </div>

      <div className="mt-4 space-y-2">
        {card.trip_stage === 2 && ["booked", "riding"].includes(card.status) && <GreenButton disabled={busy} onClick={() => act("in_car")}>I am in the car</GreenButton>}
        {card.round_trip && card.status === "riding" && card.trip_stage === 4 && <GreenButton disabled={busy} onClick={() => act("ready_home")}>I am done voting. Send my ride home.</GreenButton>}
        {actErr && <p className="text-sm text-[hsl(var(--rides-amber))]">{actErr}</p>}
      </div>

      {qs && qs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-heading text-2xl">Know your rights on the way</h2>
          <Quiz qs={qs} code={card.ride_code} token={token} done={!!card.quiz_finished} />
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map(([label, sort]) => byTopic(sort!) && (
              <button key={label} onClick={() => setAsk(ask === sort ? null : sort)} aria-expanded={ask === sort}
                className={`rounded-full border px-3 py-2 text-sm ${ask === sort ? "border-[hsl(var(--rides-green))]" : "border-[hsl(var(--rides-ink)/0.25)]"}`}>{label}</button>
            ))}
            <Link to="/app/ask" className="rounded-full border border-[hsl(var(--rides-ink)/0.25)] px-3 py-2 text-sm">What's on my ballot?</Link>
          </div>
          {ask != null && byTopic(ask) && <div className="mt-3"><InfoPanel><b className="block">{byTopic(ask)!.title}</b>{byTopic(ask)!.explanation}</InfoPanel></div>}
        </section>
      )}

      <Link to="/app/ask" className="mt-6 block"><InfoPanel>
        <b className="block">Questions about your ballot?</b>
        Ask UWAZI what is on it before you go.
      </InfoPanel></Link>
    </RidesShell>
  );
}
