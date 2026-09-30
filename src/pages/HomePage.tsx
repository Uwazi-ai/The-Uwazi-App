import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, MessageCircle, Flag, MapPin, Vote, Trophy, Wallet, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useMyJourney } from "@/hooks/useJourney";
import { useMyChallenge } from "@/hooks/useChallenge";
import { usePersonas, shortName, PERSONA_TOPIC } from "@/lib/personas";
import { stepInfo } from "@/lib/journeyStep";
import { useMyDistricts } from "@/hooks/useMyOffices";
import { useNextElection } from "@/hooks/useNextElection";
import { planDoneCount, useVotingPlan } from "@/hooks/useVotingPlan";
import { LoadingScreen } from "@/components/LoadingScreen";
import { WelcomeHero, WatchAndLearn, type HomeVideo, type WelcomeVideo } from "@/components/home/HomeVideos";
import { PersonaBadge } from "@/components/compass/PersonaBadge";
import { episodeToVideo, type EpisodeRow } from "@/lib/videoLibrary";

const db = supabase as any;
const tile = "city-tile min-w-0 rounded-[20px] border border-border bg-card p-4 sm:p-6 transition-colors hover:border-primary/50";
type Update = { kind: string; label: string; area: string; at: string };
const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, notation: "compact" }).format(n);
function ago(date: string) { const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000)); return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`; }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"; }
export default function HomePage() {
  const { user } = useAuth();
  const { city, stateCode, zipCode } = useProfile();
  const navigate = useNavigate();
  const { journey, loading, reload } = useMyJourney();
  const { challenge } = useMyChallenge();
  const { bySlug } = usePersonas();
  const { data: districts } = useMyDistricts();
  const { data: election } = useNextElection(stateCode);
  const { steps } = useVotingPlan(election?.id);
  const [welcome, setWelcome] = useState<WelcomeVideo | null>(null);
  const [seen, setSeen] = useState(true);
  const [videos, setVideos] = useState<HomeVideo[]>([]);
  const [allowCellular, setAllowCellular] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profile, asset, clips, prefs, recent, district, shows] = await Promise.all([
        db.from("profiles").select("home_welcome_seen").eq("user_id", user.id).maybeSingle(),
         db.from("videos").select("*").eq("active", true).in("placement", ["welcome", "both"]).limit(1).maybeSingle(),
         db.from("videos").select("*").eq("active", true).in("placement", ["home_row", "both"]).order("sort_order").order("created_at", { ascending: false }),
        db.from("user_preferences").select("autoplay_on_cellular").eq("user_id", user.id).maybeSingle(),
        db.rpc("home_city_updates"),
        db.from("user_districts").select("resolved").eq("user_id", user.id).maybeSingle(),
        db.from("episodes").select("id,title,description,topic,video_url,is_free,sort_order,created_at").eq("is_published", true).order("sort_order"),
      ]);
      if (cancelled) return;
      setSeen(profile.data?.home_welcome_seen ?? true);
      const episodes = ((shows.data ?? []) as EpisodeRow[]).map(episodeToVideo);
      const hero = asset.data ?? episodes[0] ?? null;
      const libraryClips = (clips.data ?? []) as HomeVideo[];
      const rest = episodes.filter((item) => item.id !== hero?.id);
      setWelcome(hero); setVideos(libraryClips.length ? [...libraryClips, ...rest] : rest);
      setAllowCellular(prefs.data?.autoplay_on_cellular ?? false);
      setUpdates(Array.isArray(recent.data) ? recent.data : []);
      const place = district.data?.resolved?.place;
      if (place) {
        const { data } = await db.from("civic_budget_percent_of_total").select("fiscal_year,total_amount,revenue_or_expense").eq("geoid", place).eq("revenue_or_expense", "expense").order("fiscal_year", { ascending: false }).limit(1);
        if (!cancelled && data?.[0]?.total_amount != null) setBudget(Number(data[0].total_amount));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);
  const dismiss = async () => {
    setSeen(true);
    if (user) { const { error } = await db.from("profiles").update({ home_welcome_seen: true }).eq("user_id", user.id); if (error) toast.error("Could not save your choice."); }
  };
  const act = async () => {
    const { data, error } = await db.rpc("log_civic_action", { _office_id: journey?.next_step?.ref ?? null, _note: note.trim() || null });
    if (error) return toast.error("We could not save that. Try again.");
    if (!data?.ok) return toast.message("You already logged an action this week. Come back next week.");
    setNote(""); reload(); toast.success("+30 points. Thank you for showing up.");
  };
  if (loading) return <LoadingScreen fullScreen={false} label="Loading Home" />;
  const persona = journey?.personalization ? bySlug(journey.persona) : null;
  const name = persona ? shortName(persona) : "there";
  const topIssues = journey?.personalization && journey.dimension_scores ? Object.entries(journey.dimension_scores).sort((a,b) => b[1]-a[1]).slice(0,3).map(([slug]) => slug) : [];
  const step = journey ? stepInfo(journey.next_step) : null;
  const covered = !!districts?.resolved?.place && !!election && ["MO", "KS"].includes(stateCode ?? "");
  const days = election ? Math.max(0, Math.ceil((new Date(`${election.election_date}T12:00:00`).getTime() - Date.now()) / 86400000)) : null;
  const prompt = persona?.suggested_prompts?.find((q) => !/ballot|polling place/i.test(q)) ?? (persona ? `How can I help with ${PERSONA_TOPIC[persona.slug] ?? "my city"} in my area?` : "Who represents me and what can I do next?");
  const live = challenge?.active && !challenge.ended_at && new Date(challenge.ends_at) > new Date() ? challenge : null;
  return <div className="city-bento mx-auto max-w-6xl space-y-6 overflow-x-hidden px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-10">
    <header className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{persona && <PersonaBadge slug={persona.slug} size="chip" label={`${persona.name} badge`} className="[&_svg]:!h-5 [&_svg]:!w-5" />}{persona?.name ?? "Your journey"}</div><h1 className="font-heading text-[28px] leading-tight text-foreground sm:text-4xl">{greeting()}, {name}</h1><p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{city ? `${city}${stateCode ? `, ${stateCode}` : ""}` : "Your area"}</p></div><Link to="/app/progress" className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"><span className="font-heading text-lg">{journey?.total_points ?? 0}</span> pts</Link></header>
    <WelcomeHero video={welcome} seen={seen} onDismiss={dismiss} />
    <WatchAndLearn videos={videos} topIssues={topIssues} allowCellular={allowCellular} />
    {step && journey && <section className={`${tile} border-primary bg-primary/10`} data-testid="home-next-step"><p className="eyebrow">Do this next</p><h2 className="mt-2 font-heading text-xl leading-snug text-foreground sm:text-2xl">{step.title}</h2><p className="mt-2 text-sm text-muted-foreground">{step.sub}</p><p className="mt-3 text-xs font-medium text-primary">{journey.stage}</p>{step.action === "civic" && <Input value={note} onChange={(e) => setNote(e.target.value.slice(0,200))} placeholder="Optional. What did you do?" aria-label="What did you do" className="mt-3 max-w-md" />}<Button onClick={step.action === "civic" ? act : () => step.to && navigate(step.to)} className="mt-4 h-auto min-h-11 whitespace-normal text-left">{step.action === "civic" ? <Flag /> : <ArrowRight />}{step.cta}</Button></section>}
    <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-4" data-testid="home-bento">
      {covered && days !== null && <Link to="/app/vote" className={`${tile} col-span-2 city-tone-1 city-tone-tint`} data-testid="election-tile"><div className="flex items-start justify-between gap-3"><div><Vote className="city-tone-text h-5 w-5" /><h2 className="mt-3 font-heading text-lg">Your election</h2></div><ChevronRight className="h-5 w-5 text-muted-foreground" /></div><div className="mt-3 flex items-center gap-5"><div><p className="font-heading city-tone-text text-5xl leading-none">{days}</p><p className="text-xs text-muted-foreground">days to vote</p></div><div className="flex h-16 w-16 items-center justify-center rounded-full border-[5px] border-primary/40 bg-background font-heading text-lg text-primary" aria-label={`${planDoneCount(steps)} of 4 done`}>{planDoneCount(steps)}/4</div><p className="text-sm text-foreground">{planDoneCount(steps)} of 4 done</p></div></Link>}
      {live && <Link to="/app/progress" className={`${tile} city-tone-3 city-tone-tint`} data-testid="challenge-tile"><Trophy className="city-tone-text h-5 w-5" /><h2 className="mt-3 font-heading text-base">Live challenge</h2><p className="mt-2 font-heading city-tone-text text-2xl">{live.zip_shown && live.zip_rank ? `#${live.zip_rank}` : "Join in"}</p><p className="mt-1 text-xs text-muted-foreground">{live.zip_shown && live.zip_rank ? `ZIP ${live.my_zip ?? zipCode ?? ""} standing` : live.title}</p></Link>}
      {budget !== null && <Link to="/app/my-city" className={`${tile} city-tone-2 city-tone-tint`} data-testid="budget-tile"><Wallet className="city-tone-text h-5 w-5" /><h2 className="mt-3 font-heading text-base">My City budget</h2><p className="mt-2 break-words font-heading city-tone-text text-2xl">{money(budget)}</p><p className="mt-1 text-xs text-muted-foreground">planned city spending</p></Link>}
      {updates.length > 0 && <Link to="/app/my-city" className={`${tile} col-span-2 city-tone-4 city-tone-tint`} data-testid="updates-tile"><h2 className="font-heading text-lg">What changed in your city</h2><ul className="mt-3 space-y-3">{updates.slice(0,3).map((item, i) => <li key={`${item.at}-${i}`} className="flex gap-2 border-t border-border pt-2 text-sm"><Clock className="city-tone-text mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0"><span className="block text-foreground">{item.kind === "office" ? `${item.label} has a new officeholder.` : item.kind === "calendar" ? `A budget date was added: ${item.label}.` : `${item.label} was added to the city budget.`}</span><span className="text-xs text-muted-foreground">{item.area} · {ago(item.at)}</span></span></li>)}</ul></Link>}
      <Link to={`/app/ask?q=${encodeURIComponent(prompt)}`} className={`${tile} col-span-2 border-primary/40 bg-primary/10`} data-testid="ask-tile"><MessageCircle className="h-5 w-5 text-primary" /><h2 className="mt-3 font-heading text-lg">Ask UWAZI</h2><p className="mt-1 text-sm text-foreground">{prompt}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Ask this <ArrowRight className="h-4 w-4" /></span></Link>
    </div>
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5"><span className="text-sm text-muted-foreground">Your next step is ready.</span><Button asChild variant="outline"><Link to={`/app/ask?q=${encodeURIComponent("What should I do next in my city?")}`}><MessageCircle />Ask UWAZI</Link></Button></div>
  </div>;
}
