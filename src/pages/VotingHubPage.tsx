import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Check, ExternalLink, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInAppBrowser } from "@/contexts/InAppBrowserContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import MyOfficialsCard from "@/components/voting/MyOfficialsCard";
import ContestSheet from "@/components/voting/ContestSheet";
import { useNextElection, formatElectionDate } from "@/hooks/useNextElection";
import { useMyOffices, useMyDistricts, groupOffices } from "@/hooks/useMyOffices";
import {
  BallotContest,
  PartyKey,
  filterContestsForParty,
  lookupPrecinct,
  useBallotContestsForState,
  useElectionAuthority,
  useVoterProfile,
} from "@/hooks/useMyBallot";
import { PlanSteps, planDoneCount, useVotingPlan } from "@/hooks/useVotingPlan";

const db = supabase as any;
const SUPPORTED_STATES = ["MO", "KS"];
const askLink = (q: string) => `/app/ask?q=${encodeURIComponent(q)}`;
const tile = "city-tile min-w-0 rounded-[20px] border border-border bg-card p-4 sm:p-6";
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function useCountUp(value: number) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduced()) { setShown(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setShown(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

function AskButton({ q, label, variant = "default", pulse = false }: { q: string; label: string; variant?: "default" | "outline"; pulse?: boolean }) {
  return (
    <Button asChild size="sm" variant={variant} className={`h-auto min-h-11 whitespace-normal text-left ${pulse ? "city-pulse" : ""}`}>
      <Link to={askLink(q)}><MessageCircle className="mr-1 h-4 w-4 shrink-0" />{label}</Link>
    </Button>
  );
}

/* ── level colors, same palette as the My City bento ── */
type Level = { key: string; label: string; tone: string };
function levelOf(c: BallotContest): Level {
  const t = `${c.measure_title} ${(c as any).office_name ?? ""}`;
  if (/U\.S\.|United States|President/i.test(t)) return { key: "federal", label: "Federal", tone: "city-tone-1" };
  if (/County|Circuit|Sheriff|Prosecut/i.test(t)) return { key: "county", label: "County", tone: "city-tone-2" };
  if (/State|Missouri|Kansas|Supreme Court|Court of Appeals|Governor/i.test(t)) return { key: "state", label: "State", tone: "city-tone-3" };
  if (c.contest_type !== "candidate_race") return { key: "question", label: "Ballot question", tone: "city-tone-4" };
  return { key: "city", label: "City", tone: "city-tone-0" };
}

/* ── the page ── */
export default function VotingHubPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { openInAppBrowser } = useInAppBrowser();
  const { data: profile, isLoading } = useVoterProfile();
  const state = profile?.state_code ?? null;
  const { data: election } = useNextElection(state);
  const { data: authority } = useElectionAuthority(profile);
  const { data: districts } = useMyDistricts();
  const { data: offices = [] } = useMyOffices();
  const party = ((profile as any)?.party_preference as PartyKey) || null;
  const { data: allContests = [] } = useBallotContestsForState(state);
  const contests = useMemo(() => filterContestsForParty(allContests, party), [allContests, party]);
  const { steps, save } = useVotingPlan(election?.id ?? null);

  const daysLeft = election?.election_date ? daysUntil(election.election_date) : null;
  const shownDays = useCountUp(Math.max(0, daysLeft ?? 0));

  const [openContest, setOpenContest] = useState<BallotContest | null>(null);
  const [officialsOpen, setOfficialsOpen] = useState(false);

  const precinct = (profile as any)?.precinct_id ?? null;
  const pollingInfo = lookupPrecinct(precinct) ?? lookupPrecinct(districts?.resolved?.voting_district ?? null);
  const registered = !!(profile as any)?.registration_verified_at;

  const { data: reminderOn } = useQuery({
    queryKey: ["election-reminder", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await db.from("notification_prefs").select("elections").eq("user_id", user!.id).maybeSingle();
      return !!data?.elections;
    },
  });

  const opened: string[] = Array.isArray(steps.opened) ? steps.opened : [];
  const allOpened = contests.length > 0 && contests.every((c) => opened.includes(c.id));

  const update = (patch: PlanSteps) => {
    const next: PlanSteps = { ...steps, ...patch };
    save.mutate(next, {
      onSuccess: (res) => { if (res.points > 0) toast.success("Your plan is done. You earned 30 points."); },
      onError: () => toast.error("We could not save that. Try again."),
    });
  };

  // The app checks these two for you when it can confirm them.
  useEffect(() => {
    if (!election?.id || save.isPending) return;
    const patch: PlanSteps = {};
    if (registered && steps.registered !== true) patch.registered = true;
    if (pollingInfo && steps.polling !== true) patch.polling = true;
    if (allOpened && steps.ballot !== true) patch.ballot = true;
    if (Object.keys(patch).length) update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [election?.id, registered, !!pollingInfo, allOpened, steps.registered, steps.polling, steps.ballot]);

  const openTile = (c: BallotContest) => {
    setOpenContest(c);
    if (!opened.includes(c.id)) update({ opened: [...opened, c.id] });
  };

  const toggleReminder = async () => {
    if (!user) return;
    const next = !reminderOn;
    const { error } = await db.from("notification_prefs").upsert({ user_id: user.id, elections: next });
    if (error) return toast.error("We could not save that. Try again.");
    qc.setQueryData(["election-reminder", user.id], next);
    toast.success(next ? "Reminders are on. We will tell you before each date." : "Reminders are off.");
  };

  if (isLoading) return <LoadingScreen fullScreen={false} />;

  const addressComplete = !!(profile?.address_line1 && profile?.city && state && (profile as any)?.zip_code);
  const cityLabel = profile?.city ? `${profile.city}, ${state}` : "Your area";
  const done = planDoneCount(steps);

  const pollHours = authority?.poll_hours || (state === "KS" ? "Polls open 7 am to 7 pm." : "Polls open 6 am to 7 pm.");
  const electionDate = election?.election_date ?? null;
  const days = daysLeft;
  const dateLine = formatElectionDate(electionDate, { weekday: "long", month: "long", day: "numeric" });

  const planRows: Array<{ key: keyof PlanSteps; label: string; note: string; auto: boolean }> = [
    { key: "registered", label: "You are registered", note: registered ? "We have this on file for you." : "Check it on your state's official page.", auto: true },
    { key: "polling", label: "Know where to vote", note: pollingInfo ? `${pollingInfo.placeName}.` : "Add your ward and precinct to find it.", auto: true },
    { key: "ballot", label: "Look at your ballot", note: contests.length ? `Open all ${contests.length} items below.` : "Your ballot items show up here.", auto: true },
    { key: "when", label: "Pick your day and time", note: "Early voting or election day. Put it on your calendar.", auto: false },
  ];
  const nextRow = planRows.find((r) => steps[r.key] !== true);

  const races = contests.filter((c) => c.contest_type === "candidate_race");
  const biggestRaceId = races[0]?.id ?? null;

  let order = 0;
  const rise = () => ({ "--tile-order": order++ } as React.CSSProperties);

  return (
    <div className="city-bento mx-auto max-w-6xl space-y-5 px-4 py-8 pb-28 md:px-8 md:pb-10">
      <header>
        <p className="eyebrow mb-2">{cityLabel}</p>
        <h1 className="font-heading text-[30px] leading-tight text-foreground">Your plan to vote</h1>
      </header>

      <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-4">
        {/* 1. Countdown */}
        <section style={rise()} className={`${tile} col-span-2 border-primary bg-primary/10`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{election?.type === "general" ? "General election" : "Next election"}</p>
              {days !== null && days >= 0 ? (
                <>
                  <p className="mt-1 flex flex-wrap items-baseline gap-2 font-heading text-primary tabular-nums">
                    <span className="text-[72px] leading-none">{shownDays}</span>
                    <span className="text-2xl">{days === 1 ? "day" : "days"}</span>
                  </p>
                  <p className="mt-3 text-sm text-foreground">{dateLine}. {pollHours}</p>
                </>
              ) : (
                <>
                  <p className="mt-2 font-heading text-2xl text-foreground">Results are not here yet.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {dateLine ? `The next election is ${dateLine}.` : "We will post the next election date soon."}
                  </p>
                </>
              )}
            </div>
            <Button
              type="button"
              onClick={toggleReminder}
              aria-pressed={!!reminderOn}
              aria-label={reminderOn ? "Turn off election reminders" : "Remind me about this election"}
              className="size-14 shrink-0 rounded-full p-0"
              variant={reminderOn ? "default" : "outline"}
            >
              {reminderOn ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </Button>
          </div>
        </section>

        {/* 2. Your plan */}
        <section style={rise()} className={`${tile} col-span-2`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg">Your plan</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {done} of 4 done. {done === 4 ? "You are set." : "Finish it for +30 points."}
              </p>
            </div>
            <PlanRing done={done} />
          </div>
          <ul className="mt-4 space-y-2">
            {planRows.map((r) => {
              const isDone = steps[r.key] === true;
              return (
                <li key={String(r.key)}>
                  <button
                    type="button"
                    aria-pressed={isDone}
                    onClick={() => {
                      if (r.key === "registered" && !isDone) {
                        openInAppBrowser(authority?.lookup_url || (state === "KS" ? "https://myvoteinfo.voteks.org/voterview/" : "https://s1.sos.mo.gov/elections/voterlookup/"));
                        return;
                      }
                      update({ [r.key]: !isDone } as PlanSteps);
                    }}
                    className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/40"
                  >
                    <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${isDone ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                      {isDone && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-medium text-foreground ${isDone ? "line-through" : ""}`}>{r.label}</span>
                      <span className="block text-xs text-muted-foreground">{r.note}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 3. Where you vote */}
        <section style={rise()} className={`${tile} city-tone-1 col-span-2`}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-heading text-lg">Where you vote</h2>
            {pollingInfo && (
              <p className="text-xs text-muted-foreground">Ward {pollingInfo.ward}, Precinct {pollingInfo.precinct}</p>
            )}
          </div>
          {pollingInfo ? (
            <>
              <p className="city-tone-text mt-3 font-heading text-[22px] leading-tight">{pollingInfo.placeName}</p>
              <p className="mt-2 text-sm text-muted-foreground">{pollingInfo.address}{pollingInfo.room ? `. ${pollingInfo.room}` : ""}</p>
              <p className="text-sm text-muted-foreground">{pollHours}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" className="city-tone-bg text-background">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pollingInfo.address}, ${profile?.city ?? "Kansas City"}, ${state}`)}`} target="_blank" rel="noreferrer">
                    <MapPin className="mr-1 h-4 w-4" />Directions
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={authority?.website || "https://www.sos.mo.gov/elections"} target="_blank" rel="noreferrer">
                    Vote early instead <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-foreground">Add your ward and precinct to find your polling place.</p>
              <p className="mt-1 text-xs text-muted-foreground">It is printed on your voter card.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm"><Link to="/app/settings">Add it in settings</Link></Button>
                <AskButton q="How do I find my ward and precinct?" label="Ask UWAZI" variant="outline" />
              </div>
            </>
          )}
          <p className="mt-4 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {authority?.website && (
              <a href={authority.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">
                {authority.display_name || "Election board"} <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <span>Your election board has the last word.</span>
          </p>
        </section>

        {/* 4. On your ballot */}
        {addressComplete && SUPPORTED_STATES.includes(state!) && (
          <>
            <div className="col-span-2 mt-2 lg:col-span-4">
              <h2 className="font-heading text-xl text-foreground">On your ballot</h2>
              <p className="text-sm text-muted-foreground">
                {contests.length ? `${contests.length} items. Tap one.` : "We are still confirming your ballot. Check back soon."}
              </p>
            </div>
            {contests.map((c) => {
              const lvl = levelOf(c);
              const wide = c.id === biggestRaceId || c.contest_type !== "candidate_race";
              const isOpen = opened.includes(c.id);
              return (
                <section key={c.id} style={rise()} className={`${tile} ${lvl.tone} relative ${wide ? "col-span-2" : "col-span-1"}`}>
                  <div className="city-tone-tint pointer-events-none absolute inset-0 rounded-[20px]" />
                  {isOpen && <Check className="absolute right-3 top-3 z-10 h-4 w-4 text-primary" aria-label="You opened this" />}
                  <button
                    type="button"
                    onClick={() => openTile(c)}
                    className="relative z-10 w-full text-left"
                  >
                    <span className="city-tone-text block text-[10px] font-bold uppercase tracking-widest">{lvl.label}</span>
                    <span className="mt-2 block font-heading text-[17px] leading-snug text-foreground">{c.measure_title}</span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {c.contest_type === "candidate_race" ? "Tap to see candidates" : "Plain words on what a yes or no means"}
                    </span>
                  </button>
                </section>
              );
            })}
          </>
        )}

        {!addressComplete && (
          <section style={rise()} className={`${tile} col-span-2 lg:col-span-4`}>
            <h2 className="font-heading text-lg">Add your address to see your ballot</h2>
            <p className="mt-2 text-sm text-muted-foreground">ZIP codes split across voting districts, so we need your street address. It stays private.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm"><Link to="/app/settings">Add my address</Link></Button>
              <AskButton q="Why do you need my address to show my ballot?" label="Ask UWAZI" variant="outline" />
            </div>
          </section>
        )}

        {/* 5. Key dates */}
        {election && (
          <section style={rise()} className={`${tile} col-span-2`}>
            <h2 className="font-heading text-lg">Key dates</h2>
            <KeyDates election={election} />
            <p className="mt-3 text-xs text-muted-foreground">
              From your state's election calendar. {authority?.display_name ? `${authority.display_name} has the last word.` : ""}
            </p>
          </section>
        )}

        {/* 6. Your officials */}
        <section style={rise()} className={`${tile} col-span-2`}>
          <h2 className="font-heading text-lg">Your officials</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {offices.length
              ? `You have ${offices.length} offices that serve you, across ${groupOffices(offices).length} levels.`
              : "We are still matching offices to where you live."}
          </p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => setOfficialsOpen(true)}>See all</Button>
        </section>

        {/* 7. Next step */}
        <section style={rise()} className={`${tile} col-span-2 border-primary lg:col-span-4`}>
          <p className="eyebrow">Your next step</p>
          <p className="my-3 text-sm text-foreground">
            {nextRow ? `${nextRow.label}. ${nextRow.note}` : "Your plan is done. Now help a neighbor make theirs."}
          </p>
          <AskButton q="What is on my ballot?" label="Ask UWAZI what is on my ballot" pulse />
        </section>
      </div>

      <ContestSheet contest={openContest} party={party} onClose={() => setOpenContest(null)} />

      <Sheet open={officialsOpen} onOpenChange={setOfficialsOpen}>
        <SheetContent side="bottom" className="h-[92dvh] overflow-y-auto bg-background">
          <SheetHeader className="text-left">
            <SheetTitle asChild><h2 className="font-heading text-2xl">Your officials</h2></SheetTitle>
          </SheetHeader>
          <div className="mt-4"><MyOfficialsCard /></div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PlanRing({ done }: { done: number }) {
  const [shown, setShown] = useState(reduced() ? done : 0);
  useEffect(() => {
    if (reduced()) { setShown(done); return; }
    const id = requestAnimationFrame(() => setShown(done));
    return () => cancelAnimationFrame(id);
  }, [done]);
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0" role="img" aria-label={`${done} of 4 done`}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
      <circle
        cx="30" cy="30" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * shown) / 4}
        style={{ transition: reduced() ? "none" : "stroke-dashoffset 900ms ease-out", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      <text x="30" y="35" textAnchor="middle" className="fill-foreground font-heading" fontSize="16">{done}</text>
    </svg>
  );
}

function KeyDates({ election }: { election: { registration_deadline: string | null; early_voting_start: string | null; election_date: string } }) {
  const today = new Date().toISOString().slice(0, 10);
  const items = [
    { d: election.registration_deadline, label: "Last day to register" },
    { d: election.early_voting_start, label: "Early voting starts" },
    { d: election.election_date, label: "Election day" },
  ].filter((i) => !!i.d) as Array<{ d: string; label: string }>;
  const next = items.find((i) => i.d >= today);
  return (
    <ul className="mt-4 grid grid-cols-3 gap-2">
      {items.map((i) => {
        const dt = new Date(`${i.d}T12:00:00`);
        const isNext = next?.d === i.d;
        const past = i.d < today;
        return (
          <li key={i.label} className={`min-w-0 rounded-lg border p-2 ${isNext ? "border-primary bg-primary/10" : "border-border"} ${past ? "text-muted-foreground" : ""}`}>
            <span className="block text-[10px] font-bold uppercase">{dt.toLocaleDateString("en-US", { month: "short" })}</span>
            <span className="font-heading text-[22px] leading-none">{dt.getDate()}</span>
            <p className="mt-1 break-words text-xs">{i.label}</p>
          </li>
        );
      })}
    </ul>
  );
}
