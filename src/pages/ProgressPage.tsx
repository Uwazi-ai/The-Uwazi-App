import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, MessageCircle, Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMyJourney, EVENT_LABELS, type MyJourney } from "@/hooks/useJourney";
import { useMyChallenge, useMyBadges } from "@/hooks/useChallenge";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { WhyAmISeeing } from "@/components/journey/WhyAmISeeing";
import { usePersonas, personaColor, shortName } from "@/lib/personas";
import { PersonaBadge, PERSONA_PATHS } from "@/components/compass/PersonaBadge";
import { DIM_ORDER, dimMeta, stageColor, topSlugs } from "@/lib/compassDims";
import { useAuth } from "@/contexts/AuthContext";
import { Award } from "lucide-react";

const db = supabase as any;
const tile = "city-tile min-w-0 rounded-[20px] border border-border bg-card p-4 sm:p-5";
const eyebrow = "text-[11px] font-bold uppercase tracking-[0.18em]";

function stepInfo(step: MyJourney["next_step"]): { title: string; sub: string; to: string | null; action?: "civic"; cta: string } {
  if (!step) return { title: "Explore My City", sub: "See what is happening near you.", to: "/app/my-city", cta: "Explore My City" };
  switch (step.type) {
    case "compass":
      return { title: "Take the Civic Compass quiz", sub: "It takes about 3 minutes. You earn 50 points.", to: "/app/compass", cta: "Take the quiz, +50 points" };
    case "survey":
      return { title: step.title ? `Answer: ${step.title}` : "Answer a short survey", sub: "Your voice helps your community. You earn 15 points.", to: "/app/home", cta: "Answer the survey, +15 points" };
    case "lesson":
      return { title: step.title ? `Start: ${step.title}` : "Start your next lesson", sub: "A short lesson. You earn 25 points.", to: `/app/learn?lesson=${step.ref}`, cta: "Start the lesson, +25 points" };
    case "office_action":
      return { title: step.title ? `Reach out to ${step.title}` : "Reach out to a local leader", sub: "Call, email, or go to a meeting. Then tap below. You earn 30 points.", to: null, action: "civic", cta: "I took action, +30 points" };
    default:
      return { title: "Explore My City", sub: "See what is happening near you.", to: "/app/my-city", cta: "Explore My City" };
  }
}

const STEP_RULE: Record<string, string> = {
  compass: "You have not taken the Compass in the last 90 days. So it comes first.",
  survey: "You turned on research. There is a survey you have not answered yet.",
  lesson: "This lesson is on the Compass issue you scored lowest on. You have not done it yet.",
  office_action: "You finished the lessons in front of you. Now it is time to reach out to a local leader you have not contacted yet.",
};

const EVENT_TONE: Record<string, number> = { lesson_complete: 4, compass_complete: 0, survey_answer: 3, civic_action: 2, report_unlock: 1 };

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useCountUp(value: number, ms = 1100) {
  const [n, setN] = useState(() => (reduced() ? value : 0));
  useEffect(() => {
    if (reduced()) { setN(value); return; }
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      setN(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return n;
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** Eight point shape from dimension scores inside two faint guide rings. */
function MiniRose({ scores, size }: { scores: Record<string, number>; size: number }) {
  const c = size / 2, r = size / 2 - 6;
  const pts = DIM_ORDER.map((d, i) => {
    const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    const v = Math.max(0.08, Number(scores[d.slug] ?? 0));
    return `${c + Math.cos(a) * r * v},${c + Math.sin(a) * r * v}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Your issue shape" data-testid="progress-rose" className="shrink-0">
      <circle cx={c} cy={c} r={r} fill="none" stroke="hsl(var(--foreground) / 0.12)" />
      <circle cx={c} cy={c} r={r / 2} fill="none" stroke="hsl(var(--foreground) / 0.08)" />
      <g className="prog-rose">
        <polygon points={pts} fill="hsl(var(--city-tone-0) / 0.22)" stroke="hsl(var(--city-tone-0))" strokeWidth={2} strokeLinejoin="round" />
        {DIM_ORDER.map((d, i) => {
          const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
          const v = Math.max(0.08, Number(scores[d.slug] ?? 0));
          return <circle key={d.slug} cx={c + Math.cos(a) * r * v} cy={c + Math.sin(a) * r * v} r={3} fill={d.color} />;
        })}
      </g>
    </svg>
  );
}

function StageRing({ pct }: { pct: number }) {
  const r = 14, len = 2 * Math.PI * r;
  const [off, setOff] = useState(reduced() ? len * (1 - pct / 100) : len);
  useEffect(() => { const t = setTimeout(() => setOff(len * (1 - pct / 100)), 60); return () => clearTimeout(t); }, [pct, len]);
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" aria-label={`${Math.round(pct)} percent of the way to the next stage`} data-testid="stage-ring">
      <circle cx={18} cy={18} r={r} fill="none" stroke="hsl(var(--city-tone-1) / 0.2)" strokeWidth={4} />
      <circle cx={18} cy={18} r={r} fill="none" stroke="hsl(var(--city-tone-1))" strokeWidth={4} strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={off} transform="rotate(-90 18 18)" className="prog-ring" data-offset={off.toFixed(1)} />
    </svg>
  );
}

export default function ProgressPage() {
  const { user } = useAuth();
  const { journey, loading, reload } = useMyJourney();
  const { bySlug } = usePersonas();
  const pp = bySlug(journey?.persona);
  const ps = bySlug(journey?.streak);
  const { challenge } = useMyChallenge();
  const badges = useMyBadges();
  const [allBadges, setAllBadges] = useState<{ id: string; name: string; description: string | null; art_key: string | null }[]>([]);
  const [profile, setProfile] = useState<{ city: string | null; since: string | null; zip: string | null }>({ city: null, since: null, zip: null });
  const [photo, setPhoto] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [allHistory, setAllHistory] = useState(false);
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  useEffect(() => { db.from("badges").select("id, name, description, art_key").order("name").then(({ data }: any) => setAllBadges(data ?? [])); }, []);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await db.from("profiles").select("city, voter_address_city, created_at, zip_code").eq("user_id", user.id).maybeSingle();
      const d = p?.created_at ?? user.created_at;
      setProfile({ city: p?.city || p?.voter_address_city || null, since: d ? new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : null, zip: p?.zip_code ?? null });
      const { data: blob } = await supabase.storage.from("identity-photos").download(`${user.id}/photo`);
      if (blob) setPhoto(URL.createObjectURL(blob));
    })();
  }, [user]);

  const points = useCountUp(journey?.total_points ?? 0);

  if (loading) return <LoadingScreen fullScreen={false} />;
  if (!journey) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center space-y-3">
        <p className="text-muted-foreground">We could not load your journey right now.</p>
        <Button onClick={reload}>Try again</Button>
      </div>
    );
  }

  const step = stepInfo(journey.next_step);
  const pct = journey.next_stage_points ? Math.min(100, (journey.total_points / journey.next_stage_points) * 100) : 100;
  const locked = allBadges.filter((b) => !badges.some((e) => e.id === b.id));
  const personal = journey.personalization && !!pp && !!journey.dimension_scores;
  const scores = journey.dimension_scores ?? {};
  const tops = topSlugs(scores, 3).map(dimMeta);
  const frame = stageColor(journey.stage);
  const conf = (journey.confidence ?? []).slice(-5);
  const confAll = journey.confidence ?? [];
  const latestConf = confAll.length ? Math.round(Number(confAll[confAll.length - 1].score) * 100) : 0;
  const firstConf = confAll.length ? Math.round(Number(confAll[0].score) * 100) : 0;
  const confDelta = latestConf - firstConf;
  const history = allHistory ? journey.history : journey.history.slice(0, 10);
  const earnedOther = personal ? badges.filter((b) => b.art_key !== pp!.slug) : badges;
  const earnedCount = badges.length;
  const liveChallenge = challenge && challenge.active && !challenge.ended_at ? challenge : null;
  const zip = liveChallenge?.my_zip ?? profile.zip;
  let order = 0;
  const o = () => ({ ["--tile-order" as any]: order++ });

  const logAction = async () => {
    const { data, error } = await db.rpc("log_civic_action", { _office_id: journey.next_step?.ref ?? null, _note: note.trim() || null });
    if (error) return toast.error("We could not save that. Try again.");
    if (!data?.ok) return toast.message("You already logged an action this week. Come back next week.");
    toast.success("+30 points. Thank you for showing up.");
    setNote("");
    reload();
  };

  // Badge chips: persona first, then earned, then locked. Up to four.
  const chips: { key: string; node: JSX.Element }[] = [];
  if (personal) chips.push({ key: "p", node: <PersonaBadge slug={pp!.slug} size="chip" label={`${pp!.name} badge`} /> });
  earnedOther.forEach((b) => chips.push({ key: b.id, node: PERSONA_PATHS[b.art_key ?? ""]
    ? <PersonaBadge slug={b.art_key!} size="chip" label={`${b.name} badge`} />
    : <span title={b.name} className="h-10 w-10 rounded-full border-2 city-tone-4 city-tone-border city-tone-tint flex items-center justify-center"><Award className="h-4 w-4 city-tone-text" /></span> }));
  locked.forEach((b) => chips.push({ key: b.id, node: PERSONA_PATHS[b.art_key ?? ""]
    ? <PersonaBadge slug={b.art_key!} size="chip" locked label={`${b.name} badge, not earned yet`} />
    : <span title={`${b.name}, not earned yet`} className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/60 flex items-center justify-center"><Award className="h-4 w-4 text-muted-foreground" /></span> }));

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 overflow-x-hidden">
      <p className={`${eyebrow} text-primary`}>Your civic journey</p>
      <h1 className="font-heading text-3xl md:text-4xl text-foreground mb-4">Progress</h1>

      <div className="city-bento grid grid-cols-2 lg:grid-cols-4 gap-[10px]" data-testid="progress-grid">
        {/* 1. Identity */}
        <div className={`city-tile col-span-2 lg:row-span-2 min-w-0 rounded-[20px] ${personal ? "prog-flip cursor-pointer" : ""} ${flipped ? "prog-flipped" : ""}`}
          style={{ ...o(), padding: 2, background: frame }} data-testid="identity-tile"
          onClick={personal ? () => setFlipped((f) => !f) : undefined} role={personal ? "button" : undefined}
          aria-pressed={personal ? flipped : undefined} aria-label={personal ? "Flip to see your top issues" : undefined}>
          <div className="prog-flip-inner h-full rounded-[18px]">
            <div className="rounded-[18px] p-4 sm:p-6 h-full flex flex-col gap-4"
              style={{ background: personal ? `linear-gradient(145deg, ${personaColor(pp!.color, 0.14)}, hsl(var(--city-tone-1) / 0.10) 45%, hsl(var(--card)) 80%)` : "hsl(var(--card))" }}>
              <div className="flex items-center justify-between gap-2">
                <p className={`${eyebrow} text-primary`}>Your civic persona</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-background" style={{ background: frame }}>{journey.stage}</span>
              </div>
              {personal ? (
                <>
                  <div className="flex items-center gap-4 flex-1">
                    <div className="lg:hidden"><MiniRose scores={scores} size={120} /></div>
                    <div className="hidden lg:block"><MiniRose scores={scores} size={200} /></div>
                    <div className="min-w-0 space-y-1">
                      {photo && <img src={photo} alt="You" className="h-12 w-12 rounded-full object-cover border-2" style={{ borderColor: frame }} />}
                      <div className="flex items-center gap-2">
                        <h2 className="font-heading text-2xl lg:text-4xl leading-tight" style={{ color: personaColor(pp!.color) }} data-testid="progress-persona">{pp!.name}</h2>
                        <PersonaBadge slug={pp!.slug} size="chip" label={`${pp!.name} badge`} className="shrink-0" />
                      </div>
                      {ps && <p className="text-sm font-semibold" style={{ color: personaColor(ps.color) }}>with a {shortName(ps)} streak</p>}
                      <p className="text-sm text-foreground">{pp!.one_line}</p>
                      <p className="text-xs text-muted-foreground">{[profile.city, profile.since && `Member since ${profile.since}`].filter(Boolean).join(". ")}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="identity-bottom">{journey.evidence ?? "Tap to see your top issues."}</p>
                </>
              ) : (
                <div className="flex-1 grid grid-cols-2 gap-4 items-end" data-testid="identity-plain">
                  <div><p className="text-xs text-muted-foreground">Points</p><p className="font-heading text-5xl text-primary">{points}</p></div>
                  <div><p className="text-xs text-muted-foreground">Stage</p><p className="font-heading text-2xl city-tone-1 city-tone-text">{journey.stage}</p></div>
                  <p className="col-span-2 text-sm text-muted-foreground">Turn on personalization in the Compass to see your civic persona here.</p>
                </div>
              )}
            </div>
            {personal && (
              <div className="prog-flip-back rounded-[18px] p-4 sm:p-6 h-full flex flex-col gap-3 bg-card" data-testid="identity-back">
                <p className={`${eyebrow} text-primary`}>Your top issues</p>
                <div className="flex-1 space-y-3">
                  {tops.map((t) => (
                    <div key={t.slug} className="flex items-center gap-3">
                      <t.Icon className="h-5 w-5" style={{ color: t.color }} />
                      <span className="flex-1 text-foreground">{t.short}</span>
                      <span className="font-heading text-2xl" style={{ color: t.color }}>{Math.round(Number(scores[t.slug]) * 100)}</span>
                      <span className="text-xs text-muted-foreground">of 100</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Does this fit you? Retake any time.</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Points */}
        <div className={`${tile} city-tone-0 city-tone-tint`} style={o()}>
          <p className="text-xs text-muted-foreground">Points</p>
          <p className="font-heading text-[56px] lg:text-[84px] leading-none text-primary my-2" data-testid="total-points">{points}</p>
          <p className="text-xs text-muted-foreground">from things you did</p>
        </div>

        {/* 3. Stage */}
        <div className={`${tile} city-tone-1 city-tone-tint`} style={o()}>
          <div className="flex items-start justify-between"><p className="text-xs text-muted-foreground">Stage</p><StageRing pct={pct} /></div>
          <p className="font-heading text-[26px] leading-tight city-tone-text my-1" data-testid="stage-name">{journey.stage}</p>
          <p className="text-xs text-muted-foreground">
            {journey.next_stage ? `${(journey.next_stage_points ?? 0) - journey.total_points} points to ${journey.next_stage}` : "Top stage. Keep going."}
          </p>
        </div>

        {/* 4. Next step */}
        <div className={`${tile} col-span-2 border-primary space-y-3`} style={o()}>
          <div className="flex items-center justify-between gap-2">
            <p className={`${eyebrow} text-primary`}>Your next step</p>
            {journey.personalization && <WhyAmISeeing rule={STEP_RULE[journey.next_step?.type ?? ""] ?? "This is the next step for everyone at your stage."} onChanged={reload} />}
          </div>
          <p className="font-heading text-xl text-foreground leading-snug">{step.title}</p>
          <p className="text-sm text-muted-foreground">{step.sub}</p>
          {step.action === "civic" && (
            <Input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} maxLength={200}
              placeholder="Optional. What did you do? One line." aria-label="What did you do" data-testid="action-note" />
          )}
          <div className="flex flex-wrap gap-2">
            {step.action === "civic" ? (
              <Button className="city-pulse" onClick={logAction}><Flag className="h-4 w-4 mr-1" /> {step.cta}</Button>
            ) : (
              <Button className="city-pulse" onClick={() => step.to && navigate(step.to)} data-testid="next-step">{step.cta} <ChevronRight className="h-4 w-4 ml-1" /></Button>
            )}
            <Button asChild variant="outline">
              <Link to={`/app/ask?q=${encodeURIComponent("What is a good next step for me to get involved in my city?")}`}><MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI</Link>
            </Button>
          </div>
        </div>

        {/* 5. Confidence */}
        {journey.personalization && (
          <div className={`${tile} col-span-2 city-tone-2`} style={o()} data-testid="confidence-tile">
            <p className="font-semibold text-foreground">How sure you feel about local issues</p>
            {confAll.length < 2 ? (
              <p className="text-sm text-muted-foreground mt-2">Chat with Ask UWAZI and we will start tracking this.</p>
            ) : (
              <>
                <div className="flex items-end justify-between gap-3 mt-2">
                  <p><span className="font-heading text-[32px] city-tone-text">{latestConf}</span> <span className="text-xs text-muted-foreground">out of 100</span></p>
                  {confDelta > 0 && <p className="text-sm font-semibold text-primary">Up {confDelta} since you started</p>}
                  {confDelta < 0 && <p className="text-sm text-muted-foreground">Down {-confDelta}</p>}
                </div>
                <div className="flex items-end gap-2 h-20 mt-3" aria-label="Last five check ins">
                  {conf.map((c, i) => (
                    <div key={i} className="prog-bar flex-1 rounded-t-md city-tone-bg" data-testid="conf-bar"
                      style={{ height: `${Math.max(6, Number(c.score) * 100)}%`, opacity: i === conf.length - 1 ? 1 : 0.35, ["--bar-i" as any]: i }} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">From short check ins with Ask UWAZI. Last five.</p>
              </>
            )}
          </div>
        )}

        {/* 6. ZIP */}
        <div className={`${tile} city-tone-3 city-tone-tint`} style={o()} data-testid="zip-tile">
          <p className="text-xs text-muted-foreground">Your ZIP{zip ? `, ${zip}` : ""}</p>
          {!liveChallenge ? (
            <p className="text-sm text-foreground mt-2">No challenge right now. Keep learning.</p>
          ) : !liveChallenge.zip_shown || !liveChallenge.zip_rank ? (
            <p className="text-sm text-foreground mt-2">
              {liveChallenge.zip_participants != null
                ? `Your ZIP needs ${Math.max(1, 10 - liveChallenge.zip_participants)} more people to show on the board.`
                : "Your ZIP needs more people to show on the board."}
            </p>
          ) : (
            <>
              <p className="my-1"><span className="font-heading text-[44px] leading-none city-tone-text">{ordinal(liveChallenge.zip_rank)}</span> <span className="text-sm text-muted-foreground">of {liveChallenge.board_size}</span></p>
              <p className="text-xs text-foreground">{liveChallenge.title}. {liveChallenge.zip_participants ?? 0} neighbors in.</p>
            </>
          )}
        </div>

        {/* 7. Badges */}
        <div className={`${tile} city-tone-4 city-tone-tint`} style={o()} data-testid="badges-tile">
          <p className="text-xs text-muted-foreground">Badges</p>
          <div className="flex gap-1.5 my-3">{chips.slice(0, 4).map((c) => <span key={c.key}>{c.node}</span>)}</div>
          <p className="text-xs text-foreground">{earnedCount} earned.{locked[0] ? ` Next: ${locked[0].name}.` : ""}</p>
        </div>

        {/* 8. History */}
        <div className={`${tile} col-span-2 lg:col-span-3`} style={o()}>
          <h2 className="font-heading text-lg text-foreground mb-2">What you have done</h2>
          {journey.history.length ? (
            <>
              <ul className="grid lg:grid-cols-2 lg:gap-x-6">
                {history.map((h, i) => (
                  <li key={i} className={`py-2 flex items-center gap-3 text-sm border-b border-border city-tone-${EVENT_TONE[h.event] ?? 0}`}>
                    <span className="h-2 w-2 rounded-full city-tone-bg shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate">{EVENT_LABELS[h.event] ?? "Earned points"}{h.title ? `: ${h.title}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(h.at)}</p>
                    </div>
                    <span className="font-heading text-base text-primary shrink-0">+{h.points}</span>
                  </li>
                ))}
              </ul>
              {journey.history.length > 10 && (
                <button className="text-sm text-primary mt-2" onClick={() => setAllHistory((v) => !v)}>{allHistory ? "Show less" : "See all"}</button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing yet. Your next step is above.</p>
          )}
        </div>

        {/* 10. Compass */}
        <div className={`${tile} col-span-2 lg:col-span-1 flex flex-col gap-2`} style={o()}>
          <p className="font-heading text-lg text-foreground">Civic Compass</p>
          <p className="text-sm text-muted-foreground flex-1">
            {journey.latest_compass_at ? `Taken ${fmtDate(journey.latest_compass_at)}. Retake any time.` : "Find the issues you care about most."}
          </p>
          <Button asChild variant="outline"><Link to={journey.latest_compass_at ? "/app/compass?view=latest" : "/app/compass"}>{journey.latest_compass_at ? "See my result" : "Take the quiz"}</Link></Button>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/app/ask?q=${encodeURIComponent("What should I do next in my city?")}`}><MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI what to do next</Link>
          </Button>
        </div>

        {/* 9. Persona history */}
        {journey.personalization && (journey.persona_history?.length ?? 0) > 1 && (
          <div className={`${tile} col-span-2 lg:col-span-4`} style={o()} data-testid="persona-history">
            <p className="text-xs text-muted-foreground mb-2">Your persona over time</p>
            <div className="flex gap-4 overflow-x-auto pb-1">
              {journey.persona_history!.map((h, i) => {
                const hp = bySlug(h.persona);
                return (
                  <div key={i} className="shrink-0 flex flex-col items-center gap-1 text-center min-w-[72px]">
                    <PersonaBadge slug={h.persona} size="chip" label={`${hp?.name ?? h.persona} badge`} />
                    <p className="text-xs font-semibold" style={{ color: personaColor(hp?.color) }}>{hp ? shortName(hp) : h.persona}</p>
                    <p className="text-[11px] text-muted-foreground">{fmtDate(h.at)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
