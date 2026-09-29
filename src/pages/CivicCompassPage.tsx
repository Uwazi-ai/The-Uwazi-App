import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, Lock, ArrowLeft, Sparkles, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dims, setDims] = useState<Dimension[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<"intro" | "quiz" | "saving" | "done">("intro");
  const [top, setTop] = useState<Top[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

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

  // If the statements have not loaded after 8 seconds, stop waiting and show the error state.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuestions((qs) => {
        if (!qs.length) setLoadFailed(true);
        return qs;
      });
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  const answer = (v: number) => {
    const q = questions[idx];
    const next = { ...answers, [q.id]: v };
    setAnswers(next);
    if (idx < questions.length - 1) setTimeout(() => setIdx(idx + 1), 150);
    else finish(next);
  };

  const finish = async (all: Record<string, number>) => {
    if (!user) return;
    setStage("saving");
    setError(null);
    try {
      // Score: invert reverse items (6 - v), weighted average per dimension, normalize 1..5 -> 0..1
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

      await db.from("compass_sessions").update({ completed_at: new Date().toISOString() }).eq("id", session.id);
      setTop(topDims);
      setStage("done");
    } catch (e: any) {
      setError(e?.message ?? "We could not save your results. Check your connection and try again.");
      setStage("quiz");
    }
  };

  const restart = () => { setAnswers({}); setIdx(0); setTop([]); setStage("quiz"); };

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

      {(stage === "quiz" || stage === "saving") && questions[idx] && (
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
                disabled={stage === "saving"}
                onClick={() => answer(o.v)}
              >
                {o.label}
              </Button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error} Your answers are still here.</p>}
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" disabled={idx === 0 || stage === "saving"} onClick={() => setIdx(idx - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {stage === "saving" && <span className="text-sm text-muted-foreground">Finding your top issues…</span>}
            {error && <Button size="sm" onClick={() => finish(answers)}>Try again</Button>}
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-6 shadow-card text-center space-y-3">
            <Compass className="h-10 w-10 text-primary mx-auto" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Your Civic Compass</p>
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
            <div className="pt-2">
              <Button asChild variant="secondary">
                <Link to={`/app/ask?q=${encodeURIComponent("What do my top values mean for my city?")}`}>
                  <MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI what this means for my city
                </Link>
              </Button>
            </div>
          </div>

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

          <div className="text-center">
            <Button variant="ghost" onClick={restart}>Take the quiz again</Button>
          </div>
        </div>
      )}
    </div>
  );
}
