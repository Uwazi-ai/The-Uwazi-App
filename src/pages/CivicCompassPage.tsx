import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Compass, Lock, ArrowLeft, Sparkles, MessageCircle, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { CompassOfficesReport } from "@/components/compass/CompassOfficesReport";
import { CompassRose } from "@/components/compass/CompassRose";
import { SwipeCard } from "@/components/compass/SwipeCard";
import { BudgetSliders, defaultBudget, type Budget } from "@/components/compass/BudgetSliders";
import { IdentityCard } from "@/components/compass/IdentityCard";
import { PeopleInCity } from "@/components/compass/PeopleInCity";
import { dimMeta } from "@/lib/compassDims";
import { IdentityFit } from "@/components/compass/IdentityFit";
import { PersonaHeadline, type PersonaState } from "@/lib/personas";
import { motion, animate } from "framer-motion";

const db = supabase as any;
const THRESHOLD = 0.6;
const LIKERT = [
  { v: 1, label: "Strongly disagree" },
  { v: 2, label: "Disagree" },
  { v: 3, label: "Not sure" },
  { v: 4, label: "Agree" },
  { v: 5, label: "Strongly agree" },
];

interface Question { id: string; dimension_id: string; prompt_text: string; weight: number; reverse_scored: boolean }
interface Dimension { id: string; name: string; slug: string }
interface Top { slug: string; name: string; score: number }

// Same scoring as before. Used for the live rose and the saved result.
export function scoreAnswers(questions: Question[], dims: Dimension[], all: Record<string, number>) {
  const acc: Record<string, { sum: number; w: number }> = {};
  for (const q of questions) {
    const raw = all[q.id];
    if (!raw) continue;
    const v = q.reverse_scored ? 6 - raw : raw;
    const w = Number(q.weight) || 1;
    acc[q.dimension_id] ??= { sum: 0, w: 0 };
    acc[q.dimension_id].sum += v * w;
    acc[q.dimension_id].w += w;
  }
  const scores: Record<string, number> = {};
  for (const d of dims) {
    const a = acc[d.id];
    if (a && a.w > 0) scores[d.slug] = Math.round(((a.sum / a.w - 1) / 4) * 1000) / 1000;
  }
  return scores;
}

interface Fact { id: string; dimension_id: string; geoid: string | null; text: string; source_url: string }

function joinNames(n: string[]) {
  if (n.length <= 1) return n[0] ?? "";
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n.slice(0, -1).join(", ")}, and ${n[n.length - 1]}`;
}

export default function CivicCompassPage() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [params] = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dims, setDims] = useState<Dimension[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<"intro" | "quiz" | "budget" | "consent" | "saving" | "reveal" | "done">("intro");
  const [budget, setBudget] = useState<Budget>(defaultBudget());
  const [facts, setFacts] = useState<Fact[]>([]);
  const [place, setPlace] = useState<string | null>(null);
  const [fact, setFact] = useState<Fact | null>(null);
  const [needle, setNeedle] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [journeyStage, setJourneyStage] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ points: number; from: number; to: number; next: string | null; stage: string } | null>(null);
  const [shown, setShown] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [top, setTop] = useState<Top[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [personalize, setPersonalize] = useState(false);
  const [research, setResearch] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [persona, setPersona] = useState<PersonaState>({ persona: null, streak: null, evidence: null });
  const [firstLesson, setFirstLesson] = useState<{ id: string; dim: string | null } | null>(null);

  const loadQuestions = async () => {
    setLoadFailed(false);
    const [q, d] = await Promise.all([
      db.from("compass_questions").select("id, dimension_id, prompt_text, weight, reverse_scored").eq("active", true).order("order_index").limit(20),
      db.from("compass_dimensions").select("id, name, slug"),
    ]);
    if (q.error || d.error || !q.data?.length) {
      setLoadFailed(true);
      return;
    }
    setQuestions(q.data);
    setDims(d.data ?? []);
  };

  useEffect(() => { loadQuestions(); }, []);

  useEffect(() => {
    db.from("compass_facts").select("id, dimension_id, geoid, text, source_url").eq("active", true).then(({ data }: any) => setFacts(data ?? []));
    if (user) db.from("user_districts").select("resolved").eq("user_id", user.id).maybeSingle().then(({ data }: any) => setPlace(data?.resolved?.place ?? null));
  }, [user]);

  const loadStage = async () => {
    const { data } = await db.rpc("get_my_journey");
    setJourneyStage(data?.stage ?? null);
    return data;
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setQuestions((qs) => {
        if (!qs.length) setLoadFailed(true);
        return qs;
      });
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  // Open the latest saved result when linked from the Progress page.
  useEffect(() => {
    if (params.get("view") !== "latest" || !user) return;
    (async () => {
      const { data: s } = await db.from("compass_sessions").select("id").eq("user_id", user.id)
        .not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(1).maybeSingle();
      if (!s) return;
      const { data: r } = await db.from("compass_results").select("top_dimensions, dimension_scores").eq("session_id", s.id).maybeSingle();
      setFinalScores((r?.dimension_scores as Record<string, number>) ?? {});
      loadStage();
      const { data: p } = await db.from("user_civic_persona").select("persona_labels, consent_scope").eq("user_id", user.id).maybeSingle();
      setSessionId(s.id);
      setTop((r?.top_dimensions as Top[]) ?? []);
      if (p?.consent_scope?.personalization) {
        setLabel(p.persona_labels?.primary ?? null);
        setPersona({ persona: p.persona_labels?.persona ?? null, streak: p.persona_labels?.streak ?? null, evidence: p.persona_labels?.evidence ?? null });
      }
      setStage("done");
    })();
  }, [params, user]);

  // Find the first lesson for the top issue once results show.
  useEffect(() => {
    if (stage !== "done" || !user) return;
    (async () => {
      const topDim = top[0] ? dims.find((d) => d.slug === top[0].slug) ?? (await db.from("compass_dimensions").select("id, name, slug").eq("slug", top[0].slug).maybeSingle()).data : null;
      const { data: done } = await db.from("user_lesson_progress").select("lesson_id").eq("user_id", user.id).eq("status", "completed");
      const doneIds = new Set((done ?? []).map((d: any) => d.lesson_id));
      if (topDim) {
        const { data: ls } = await db.from("lessons").select("id").eq("is_published", true).eq("dimension_id", topDim.id).order("lesson_number");
        const pick = (ls ?? []).find((l: any) => !doneIds.has(l.id));
        if (pick) { setFirstLesson({ id: pick.id, dim: topDim.name }); return; }
      }
      const { data: path } = await db.rpc("get_my_path");
      if (path?.stage_lesson) setFirstLesson({ id: path.stage_lesson.id, dim: null });
    })();
  }, [stage, top, dims, user]);

  const answer = (v: number) => {
    const q = questions[idx];
    const next = { ...answers, [q.id]: v };
    setAnswers(next);
    const dim = dims.find((d) => d.id === q.dimension_id);
    setNeedle(dim?.slug ?? null);
    const isLast = idx >= questions.length - 1;
    if (!isLast && (idx + 1) % 4 === 0) {
      const pool = facts.filter((f) => f.dimension_id === q.dimension_id);
      const pick = (place && pool.find((f) => f.geoid === place)) || pool.find((f) => !f.geoid) || null;
      if (pick) { setTimeout(() => setFact(pick), 250); }
    }
    if (!isLast) setTimeout(() => setIdx(idx + 1), 150);
    else setTimeout(() => setStage("budget"), 350);
  };

  const finish = async (all: Record<string, number>) => {
    if (!user) return;
    setStage("saving");
    setError(null);
    try {
      const scores = scoreAnswers(questions, dims, all);
      const topDims: Top[] = dims
        .filter((d) => (scores[d.slug] ?? 0) >= THRESHOLD)
        .map((d) => ({ slug: d.slug, name: d.name, score: scores[d.slug] }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const { data: session, error: sErr } = await db
        .from("compass_sessions")
        .insert({ user_id: user.id, locale: navigator.language?.slice(0, 2) || "en" })
        .select("id").single();
      if (sErr) throw sErr;

      const { error: rErr } = await db.from("compass_responses").insert(
        Object.entries(all).map(([question_id, answer_value]) => ({ session_id: session.id, question_id, answer_value })),
      );
      if (rErr) throw rErr;

      const { error: bErr } = await db.from("compass_budget_priorities").insert({ session_id: session.id, allocation: budget });
      if (bErr) throw bErr;

      const { error: resErr } = await db.from("compass_results").insert({
        session_id: session.id, dimension_scores: scores, top_dimensions: topDims,
      });
      if (resErr) throw resErr;

      const { data: done, error: cErr } = await db.rpc("complete_compass_session", {
        _session_id: session.id, _personalization: personalize, _research: research,
      });
      if (cErr) throw cErr;
      setSessionId(session.id);
      setLabel(done?.label ?? null);
      setPersona({ persona: done?.persona ?? null, streak: done?.streak ?? null, evidence: done?.evidence ?? null });
      setTop(topDims);
      setFinalScores(scores);
      const j = await loadStage();
      const pts = Number(done?.points_awarded ?? 0);
      const total = Number(j?.total_points ?? pts);
      const goal = Number(j?.next_stage_points ?? total) || 1;
      setReveal({ points: pts, from: Math.max(0, ((total - pts) / goal) * 100), to: Math.min(100, (total / goal) * 100), next: j?.next_stage ?? null, stage: j?.stage ?? done?.stage ?? "" });
      setShown(0); setRevealed(false);
      setStage("reveal");
    } catch (e: any) {
      setError(e?.message ?? "We could not save your results. Check your connection and try again.");
      setStage("consent");
    }
  };

  // Points moment: count up, fill the bar, then reveal the identity.
  useEffect(() => {
    if (stage !== "reveal" || !reveal) return;
    const c = animate(0, reveal.points, { duration: 1.2, onUpdate: (n) => setShown(Math.round(n)) });
    const t = setTimeout(() => setRevealed(true), 2400);
    return () => { c.stop(); clearTimeout(t); };
  }, [stage, reveal]);

  const liveScores = scoreAnswers(questions, dims, answers);

  const restart = () => { setAnswers({}); setIdx(0); setTop([]); setLabel(null); setPersona({ persona: null, streak: null, evidence: null }); setFirstLesson(null); setNeedle(null); setBudget(defaultBudget()); setStage("quiz"); };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 overflow-x-hidden">
      {stage === "intro" && (
        <div className="text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Compass className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">Civic Compass</h1>
          <p className="text-muted-foreground">
            You will see {questions.length || 16} short statements. Swipe or tap to say how much you agree. Watch your compass grow. At the end, you get your own civic identity card. It takes about 3 minutes.
          </p>
          {loadFailed && !questions.length ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">We could not load the quiz right now. Check your connection and try again.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button size="lg" onClick={loadQuestions}>Try again</Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to={`/app/ask?q=${encodeURIComponent("How do I find out what my city is working on?")}`}>
                    <MessageCircle className="h-4 w-4 mr-2" /> Ask UWAZI
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <Button size="lg" disabled={!questions.length} onClick={() => setStage("quiz")}>{questions.length ? "Start the quiz" : "Loading the quiz…"}</Button>
          )}
          <p><Link to="/fair" className="text-xs text-muted-foreground underline">How UWAZI stays fair</Link></p>
        </div>
      )}

      {stage === "quiz" && questions[idx] && (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Question {idx + 1} of {questions.length}</span>
              <span>{questions.length - idx} left</span>
            </div>
            <Progress value={(idx / questions.length) * 100} />
          </div>
          <div className="flex justify-center" data-testid="live-rose">
            <CompassRose scores={liveScores} needle={needle} size={200} />
          </div>
          {fact ? (
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 space-y-3" data-testid="fact-card">
              <p className="text-xs font-bold tracking-wider text-primary">DID YOU KNOW</p>
              <p className="text-lg font-semibold text-foreground">{fact.text}</p>
              <a href={fact.source_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">See the official source</a>
              <div><Button onClick={() => setFact(null)}>Keep going</Button></div>
            </div>
          ) : (
            <>
              <SwipeCard key={questions[idx].id} text={questions[idx].prompt_text} onAnswer={answer} />
              <p className="text-xs text-center text-muted-foreground">Swipe right to agree. Swipe left to disagree. Tap the card if you are not sure.</p>
              <div className="grid grid-cols-5 gap-1">
                {LIKERT.map((o) => (
                  <Button
                    key={o.v}
                    variant={answers[questions[idx].id] === o.v ? "default" : "outline"}
                    className="h-auto py-2 px-1 text-[11px] leading-tight whitespace-normal"
                    onClick={() => answer(o.v)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" disabled={idx === 0 || !!fact} onClick={() => setIdx(idx - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        </div>
      )}

      {stage === "budget" && (
        <BudgetSliders value={budget} onChange={setBudget} onBack={() => setStage("quiz")} onDone={() => setStage("consent")} />
      )}

      {stage === "reveal" && reveal && (
        <div className="space-y-6 text-center" data-testid="reveal">
          <motion.p initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="text-5xl font-extrabold text-primary">+{shown}</motion.p>
          <p className="text-foreground font-medium">You just did something most people never do. You learned what matters to you in your city.</p>
          <div className="space-y-1 text-left">
            <div className="flex justify-between text-xs text-muted-foreground"><span>{reveal.stage}</span>{reveal.next && <span>{reveal.next}</span>}</div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full bg-primary" initial={{ width: `${reveal.from}%` }} animate={{ width: `${reveal.to}%` }} transition={{ delay: 1.2, duration: 0.9 }} />
            </div>
          </div>
          {revealed && (
            <motion.div initial={{ opacity: 0.2, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
              <div className="flex justify-center"><CompassRose scores={finalScores} size={240} /></div>
              {persona.persona ? <PersonaHeadline state={persona} /> : (
                <h2 className="font-heading text-3xl text-foreground">{label ?? (top.length ? `You lead with ${joinNames(top.map((t) => t.name))}` : "You see many sides")}</h2>
              )}
              <Button size="lg" onClick={() => setStage("done")}>See my card</Button>
            </motion.div>
          )}
        </div>
      )}

      {(stage === "consent" || stage === "saving") && (
        <div className="space-y-5">
          <div className="text-center space-y-2">
            <Compass className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-2xl font-extrabold text-foreground">You are done. Two quick choices.</h2>
            <p className="text-sm text-muted-foreground">Both are off unless you turn them on. You can say yes to one, both, or neither.</p>
          </div>
          <label className="flex items-start justify-between gap-4 bg-card rounded-2xl p-5 border border-border cursor-pointer">
            <div>
              <p className="font-semibold text-foreground">Personalize my UWAZI experience</p>
              <p className="text-sm text-muted-foreground">We use your answers to pick lessons and next steps for you.</p>
            </div>
            <Switch checked={personalize} onCheckedChange={setPersonalize} aria-label="Personalize my UWAZI experience" />
          </label>
          <label className="flex items-start justify-between gap-4 bg-card rounded-2xl p-5 border border-border cursor-pointer">
            <div>
              <p className="font-semibold text-foreground">Use my anonymized answers for civic research</p>
              <p className="text-sm text-muted-foreground">Your name is never shown. Your answers are counted with others to learn what people care about.</p>
            </div>
            <Switch checked={research} onCheckedChange={setResearch} aria-label="Use my anonymized answers for civic research" />
          </label>
          {error && <p className="text-sm text-destructive">{error} Your answers are still here.</p>}
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="sm" disabled={stage === "saving"} onClick={() => setStage("quiz")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button size="lg" disabled={stage === "saving"} onClick={() => finish(answers)}>
              {stage === "saving" ? "Finding your top issues…" : "See my results"}
            </Button>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-6 shadow-card text-center space-y-3">
            <Compass className="h-10 w-10 text-primary mx-auto" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Your Civic Compass</p>
            {persona.persona ? <PersonaHeadline state={persona} size="md" /> : label && <p className="text-sm font-bold text-primary" data-testid="identity-label">{label}</p>}
            {label && <IdentityFit sessionId={sessionId} onChange={(d) => { setLabel(d.label); setPersona({ persona: d.persona, streak: d.streak, evidence: d.evidence }); }} />}
            <h2 className="text-2xl font-extrabold text-foreground">
              {top.length
                ? `You lead with ${joinNames(top.map((t) => t.name))}`
                : "You care about many issues about the same"}
            </h2>
            {!top.length && (
              <p className="text-sm text-muted-foreground">No one issue stood out. That is a good thing. It means you see many sides of your community.</p>
            )}
            {top.length > 0 && (
              <p className="text-sm text-muted-foreground">Your city is better when people like you show up.</p>
            )}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {top.map((t) => (
                <span key={t.slug} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/15 text-foreground text-sm font-medium">{(() => { const M = dimMeta(t.slug); return <M.Icon className="h-3.5 w-3.5" style={{ color: M.color }} />; })()}{t.name}</span>
              ))}
            </div>
          </div>

          <IdentityCard label={label} persona={persona.persona} streak={persona.streak} scores={finalScores} stage={journeyStage}
            fallbackTitle={top.length ? `You lead with ${top[0].name}` : "You see many sides"} />

          <PeopleInCity />

          {firstLesson && (
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary shrink-0" />
              <p className="flex-1 text-foreground font-medium">
                {firstLesson.dim
                  ? `Start your first lesson on ${firstLesson.dim}. It takes about 3 minutes.`
                  : "Start your first lesson. It takes about 3 minutes."}
              </p>
              <Button asChild><Link to={`/app/learn?lesson=${firstLesson.id}`}>Start the lesson</Link></Button>
            </div>
          )}

          <div className="text-center">
            <Button asChild variant="secondary">
              <Link to={`/app/ask?q=${encodeURIComponent("What do my top values mean for my city?")}`}>
                <MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI what this means for my city
              </Link>
            </Button>
          </div>

          {isPremium ? <CompassOfficesReport sessionId={sessionId} /> : (
          <div className="relative bg-card rounded-2xl p-6 shadow-card overflow-hidden border border-border">
            <div className="space-y-3 blur-sm select-none pointer-events-none min-h-[280px] flex flex-col justify-center" aria-hidden>
              {[80, 65, 55, 40, 70, 50].map((w, i) => (
                <div key={i} className="h-3 rounded-full bg-muted" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-background/70 backdrop-blur-sm space-y-3">
              <Lock className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Your full Civic Compass report</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                See who represents you. Learn how your issues connect to your ballot and where you can help.
              </p>
              <Button asChild>
                <Link to="/app/upgrade"><Sparkles className="h-4 w-4 mr-1" /> Unlock with UWAZI+</Link>
              </Button>
            </div>
          </div>
          )}

          <div className="text-center flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild variant="outline"><Link to="/app/progress">See your journey</Link></Button>
            <Button variant="ghost" onClick={restart}>Take the quiz again</Button>
          </div>
        </div>
      )}
    </div>
  );
}
