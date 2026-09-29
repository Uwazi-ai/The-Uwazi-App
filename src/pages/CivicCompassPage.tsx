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
  const [stage, setStage] = useState<"intro" | "quiz" | "consent" | "saving" | "done">("intro");
  const [top, setTop] = useState<Top[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [personalize, setPersonalize] = useState(false);
  const [research, setResearch] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
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
      const { data: r } = await db.from("compass_results").select("top_dimensions").eq("session_id", s.id).maybeSingle();
      const { data: p } = await db.from("user_civic_persona").select("persona_labels, consent_scope").eq("user_id", user.id).maybeSingle();
      setSessionId(s.id);
      setTop((r?.top_dimensions as Top[]) ?? []);
      if (p?.consent_scope?.personalization) setLabel(p.persona_labels?.primary ?? null);
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
    if (idx < questions.length - 1) setTimeout(() => setIdx(idx + 1), 150);
    else setTimeout(() => setStage("consent"), 150);
  };

  const finish = async (all: Record<string, number>) => {
    if (!user) return;
    setStage("saving");
    setError(null);
    try {
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

      const { error: resErr } = await db.from("compass_results").insert({
        session_id: session.id, dimension_scores: scores, top_dimensions: topDims,
      });
      if (resErr) throw resErr;

      const { data: done, error: cErr } = await db.rpc("complete_compass_session", {
        _session_id: session.id, _personalization: personalize, _research: research,
      });
      if (cErr) throw cErr;
      if (done?.points_awarded > 0) toast.success(`+${done.points_awarded} points. You are now ${done.stage}.`);

      setSessionId(session.id);
      setLabel(done?.label ?? null);
      setTop(topDims);
      setStage("done");
    } catch (e: any) {
      setError(e?.message ?? "We could not save your results. Check your connection and try again.");
      setStage("consent");
    }
  };

  const restart = () => { setAnswers({}); setIdx(0); setTop([]); setLabel(null); setFirstLesson(null); setStage("quiz"); };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 overflow-x-hidden">
      {stage === "intro" && (
        <div className="text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Compass className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">Civic Compass</h1>
          <p className="text-muted-foreground">
            You will see {questions.length || 16} short statements. Pick how much you agree with each one. At the end, we show the issues you care about most. It takes about 3 minutes.
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
        </div>
      )}

      {stage === "quiz" && questions[idx] && (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Question {idx + 1} of {questions.length}</span>
              <span>{questions.length - idx} left</span>
            </div>
            <Progress value={(idx / questions.length) * 100} />
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-card min-h-[140px] flex items-center">
            <p className="text-xl font-semibold text-foreground leading-snug">{questions[idx].prompt_text}</p>
          </div>
          <div className="grid gap-2">
            {LIKERT.map((o) => (
              <Button
                key={o.v}
                variant={answers[questions[idx].id] === o.v ? "default" : "outline"}
                className="justify-start h-12 text-base"
                onClick={() => answer(o.v)}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
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
            {label && <p className="text-sm font-bold text-primary">{label}</p>}
            <h2 className="text-2xl font-extrabold text-foreground">
              {top.length
                ? `You lead with ${joinNames(top.map((t) => t.name))}`
                : "You care about many issues about the same"}
            </h2>
            {!top.length && (
              <p className="text-sm text-muted-foreground">No one issue stood out. That is a good thing. It means you see many sides of your community.</p>
            )}
            {top.length > 0 && (
              <p className="text-sm text-muted-foreground">These are the issues you agreed with most. Each one scored at least 60 out of 100.</p>
            )}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {top.map((t) => (
                <span key={t.slug} className="px-3 py-1 rounded-full bg-primary/15 text-primary text-sm font-medium">{t.name} · {Math.round(t.score * 100)}</span>
              ))}
            </div>
          </div>

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
                See your score for all 8 issues. Learn how they connect to your ballot and where you can help in your area.
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
