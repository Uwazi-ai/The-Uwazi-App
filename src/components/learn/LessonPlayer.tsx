import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle, XCircle, Trophy,
  Clock, Zap, ChevronRight, ExternalLink, Lightbulb, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EnrichedLesson } from "@/hooks/useLessonTracks";

interface LessonPlayerProps {
  lesson: EnrichedLesson;
  onClose: () => void;
  onComplete: () => void;
}

export default function LessonPlayer({ lesson, onClose, onComplete }: LessonPlayerProps) {
  const { user } = useAuth();
  const slides = Array.isArray(lesson.content) ? lesson.content : [];
  const quizQuestions = Array.isArray(lesson.quiz_questions) ? lesson.quiz_questions : [];
  const takeaways = Array.isArray(lesson.key_takeaways) ? lesson.key_takeaways : [];
  const actions = Array.isArray(lesson.action_items) ? lesson.action_items : [];

  const totalSteps = slides.length + quizQuestions.length + (takeaways.length > 0 ? 1 : 0);
  const [step, setStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  const [revealedQuiz, setRevealedQuiz] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(Date.now());

  const isSlide = step < slides.length;
  const quizIndex = step - slides.length;
  const isTakeaway = step === slides.length + quizQuestions.length;
  const isQuiz = !isSlide && !isTakeaway && quizIndex >= 0 && quizIndex < quizQuestions.length;

  const progressPct = ((step + 1) / totalSteps) * 100;

  const currentSlide = isSlide ? slides[step] : null;
  const currentQuiz = isQuiz ? quizQuestions[quizIndex] : null;

  const correctCount = quizQuestions.reduce((n, q) => {
    const ans = quizAnswers[q.id];
    return n + (ans === q.correct ? 1 : 0);
  }, 0);

  const handleQuizAnswer = (questionId: string, answerIdx: number) => {
    if (revealedQuiz.has(questionId)) return;
    setQuizAnswers(prev => ({ ...prev, [questionId]: answerIdx }));
    setRevealedQuiz(prev => new Set(prev).add(questionId));
  };

  const handleComplete = useCallback(async () => {
    if (!user || completed) return;
    setCompleted(true);

    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const score = quizQuestions.length > 0
      ? Math.round((correctCount / quizQuestions.length) * 100)
      : 100;

    // Upsert progress
    await supabase.from("user_lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lesson.id,
        status: "completed",
        score,
        quiz_score: score,
        current_slide: slides.length,
        last_slide_seen: slides.length,
        time_spent_seconds: timeSpent,
        quiz_attempts: 1,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );

    // Update civic score
    const { data: existing } = await supabase
      .from("civic_scores")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const xp = lesson.xp_reward || 0;
    if (existing) {
      await supabase.from("civic_scores").update({
        total_xp: (existing.total_xp || 0) + xp,
        lessons_completed: (existing.lessons_completed || 0) + 1,
        quizzes_passed: (existing.quizzes_passed || 0) + (score >= 75 ? 1 : 0),
        civic_literacy_score: Math.min(100, (existing.civic_literacy_score || 0) + 5),
      }).eq("user_id", user.id);
    } else {
      await supabase.from("civic_scores").insert({
        user_id: user.id,
        total_xp: xp,
        lessons_completed: 1,
        quizzes_passed: score >= 75 ? 1 : 0,
        civic_literacy_score: 5,
      });
    }

    // Update streak
    const today = new Date().toISOString().split("T")[0];
    const { data: streak } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (streak) {
      const lastDate = streak.last_active_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const newStreak = lastDate === yesterday ? (streak.current_streak || 0) + 1 : lastDate === today ? streak.current_streak : 1;
      await supabase.from("streaks").update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streak.longest_streak || 0),
        last_active_date: today,
      }).eq("user_id", user.id);
    } else {
      await supabase.from("streaks").insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_active_date: today,
      });
    }

    toast.success(`+${xp} XP earned! 🎓`);
    onComplete();
  }, [user, lesson, completed, correctCount, quizQuestions.length, slides.length, startTime, onComplete]);

  // Completion screen
  if (completed) {
    const score = quizQuestions.length > 0 ? Math.round((correctCount / quizQuestions.length) * 100) : 100;
    const passed = score >= 75;

    return (
      <div
        className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full text-center space-y-6">
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="h-24 w-24 rounded-full mx-auto flex items-center justify-center"
            style={{ background: passed ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" : "hsl(var(--muted))" }}
          >
            {passed ? <Trophy className="h-12 w-12 text-primary-foreground" /> : <Target className="h-12 w-12 text-muted-foreground" />}
          </motion.div>

          <div>
            <h2 className="font-heading text-3xl text-foreground mb-1">
              {passed ? "LESSON COMPLETE!" : "GOOD EFFORT!"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {passed ? "You crushed it." : "Review the lesson and try again for full XP."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-2xl font-bold text-primary">+{lesson.xp_reward}</p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-2xl font-bold text-foreground">{correctCount}/{quizQuestions.length}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="text-2xl font-bold text-foreground">{score}%</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
          </div>

          {takeaways.length > 0 && (
            <div className="bg-card rounded-xl p-4 border border-border text-left space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Key Takeaways</p>
              {takeaways.map((t: string, i: number) => (
                <p key={i} className="text-sm text-muted-foreground flex gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {t}
                </p>
              ))}
            </div>
          )}

          {actions.length > 0 && (
            <div className="space-y-2">
              {actions.map((a: any, i: number) => (
                <a key={i} href={a.url} target={a.url?.startsWith("http") ? "_blank" : undefined}
                   rel="noopener noreferrer"
                   className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
                  {a.action}
                  <ExternalLink className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}

          <Button onClick={onClose} size="lg" className="w-full">
            Back to Lessons
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-background z-50 flex flex-col"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={onClose}
          aria-label="Close lesson"
          className="text-muted-foreground hover:text-foreground p-1 -ml-1 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <Progress value={progressPct} className="h-2" />
        </div>
        <span className="text-xs font-medium text-muted-foreground shrink-0">{step + 1}/{totalSteps}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {/* SLIDE CONTENT */}
              {isSlide && currentSlide && <SlideContent slide={currentSlide} trackColor={null} />}

              {/* QUIZ */}
              {isQuiz && currentQuiz && (
                <QuizCard
                  question={currentQuiz}
                  answer={quizAnswers[currentQuiz.id] ?? null}
                  revealed={revealedQuiz.has(currentQuiz.id)}
                  onAnswer={(idx) => handleQuizAnswer(currentQuiz.id, idx)}
                  index={quizIndex + 1}
                  total={quizQuestions.length}
                />
              )}

              {/* TAKEAWAYS (final step) */}
              {isTakeaway && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Lightbulb className="h-12 w-12 text-primary mx-auto mb-3" />
                    <h2 className="font-heading text-2xl text-foreground">Key Takeaways</h2>
                    <p className="text-sm text-muted-foreground mt-1">What to remember from this lesson</p>
                  </div>
                  <div className="space-y-3">
                    {takeaways.map((t: string, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-3 bg-card rounded-xl p-4 border border-border"
                      >
                        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">{t}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav — sits above mobile tab bar; centered CTA on mobile */}
      <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+88px)] md:pb-3 border-t border-border grid grid-cols-3 items-center gap-2">
        <div className="justify-self-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        <div className="justify-self-center">
          {step < totalSteps - 1 ? (
            <Button
              size="lg"
              onClick={() => setStep(step + 1)}
              disabled={isQuiz && !revealedQuiz.has(currentQuiz?.id || "")}
              className="min-w-[160px]"
            >
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} size="lg" className="bg-primary min-w-[160px]">
              <Trophy className="h-4 w-4 mr-1" /> Complete
            </Button>
          )}
        </div>

        <div className="justify-self-end" aria-hidden />
      </div>
    </div>
  );
}

// ─── SLIDE RENDERER ───────────────────────────────────────
function SlideContent({ slide, trackColor }: { slide: any; trackColor: string | null }) {
  const type = slide.type;

  if (type === "intro") {
    return (
      <div className="text-center py-8 space-y-4">
        {slide.emoji && <span className="text-6xl">{slide.emoji}</span>}
        <h1 className="font-heading text-3xl sm:text-4xl text-foreground leading-tight">{slide.headline}</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">{slide.body}</p>
      </div>
    );
  }

  if (type === "stat") {
    return (
      <div className="text-center py-8 space-y-3">
        <motion.p
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl sm:text-7xl font-bold text-primary"
        >
          {slide.number}
        </motion.p>
        <p className="text-lg font-semibold text-foreground">{slide.label}</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{slide.context}</p>
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className="space-y-3">
        <h2 className="font-heading text-2xl text-foreground">{slide.headline}</h2>
        <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">{slide.body}</div>
      </div>
    );
  }

  if (type === "comparison") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ComparisonCard side={slide.left} />
          <ComparisonCard side={slide.right} />
        </div>
      </div>
    );
  }

  if (type === "example") {
    return (
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full uppercase">Scenario</span>
        </div>
        <p className="text-base text-foreground font-medium">{slide.scenario}</p>
        <div className="border-l-2 border-primary pl-4">
          <p className="text-sm text-muted-foreground">{slide.answer}</p>
        </div>
      </div>
    );
  }

  if (type === "local") {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-primary text-lg">📍</span>
          <h3 className="font-semibold text-foreground">{slide.headline}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{slide.body}</p>
      </div>
    );
  }

  if (type === "timeline") {
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-2xl text-foreground text-center mb-6">Timeline</h2>
        <div className="space-y-0">
          {slide.events?.map((e: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4 relative"
            >
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-primary shrink-0 mt-1.5" />
                {i < slide.events.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
              </div>
              <div className="pb-6">
                <p className="text-sm font-bold text-primary">{e.year}</p>
                <p className="text-sm text-foreground">{e.event}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "quiz_intro") {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <h2 className="font-heading text-2xl text-foreground">{slide.headline}</h2>
        <p className="text-muted-foreground">{slide.body}</p>
      </div>
    );
  }

  if (type === "quote") {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-2xl italic text-foreground leading-relaxed">"{slide.text}"</p>
        <p className="text-sm text-primary font-semibold">— {slide.author}</p>
        {slide.context && <p className="text-xs text-muted-foreground">{slide.context}</p>}
      </div>
    );
  }

  // Fallback
  return (
    <div className="space-y-3">
      {slide.headline && <h2 className="font-heading text-2xl text-foreground">{slide.headline}</h2>}
      {slide.body && <p className="text-base text-muted-foreground whitespace-pre-line">{slide.body}</p>}
    </div>
  );
}

function ComparisonCard({ side }: { side: any }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-semibold text-foreground text-sm">{side.label}</h3>
      <ul className="space-y-1.5">
        {side.items?.map((item: string, i: number) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2">
            <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── QUIZ CARD ────────────────────────────────────────────
function QuizCard({
  question, answer, revealed, onAnswer, index, total
}: {
  question: any; answer: number | null; revealed: boolean;
  onAnswer: (idx: number) => void; index: number; total: number;
}) {
  const qType = question.type || "multiple_choice";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Zap className="h-4 w-4 text-primary" />
        Question {index} of {total}
      </div>

      <h3 className="text-lg font-semibold text-foreground">{question.question}</h3>

      {(qType === "multiple_choice" || qType === "scenario") && (
        <div className="space-y-2.5">
          {question.options?.map((opt: string, i: number) => {
            const isCorrect = i === question.correct;
            const isSelected = answer === i;
            return (
              <button
                key={i}
                onClick={() => onAnswer(i)}
                disabled={revealed}
                className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-all border-2 ${
                  revealed
                    ? isCorrect
                      ? "border-primary bg-primary/10 text-primary"
                      : isSelected
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-transparent bg-card text-muted-foreground"
                    : "border-border bg-card hover:border-primary/40 text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    revealed && isCorrect ? "bg-primary text-primary-foreground" :
                    revealed && isSelected ? "bg-destructive text-destructive-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                  {revealed && isCorrect && <CheckCircle className="h-4 w-4 text-primary ml-auto shrink-0" />}
                  {revealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-destructive ml-auto shrink-0" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {qType === "true_false" && (
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((val, i) => {
            const isCorrect = val === question.correct;
            const isSelected = answer === i;
            return (
              <button
                key={i}
                onClick={() => onAnswer(i)}
                disabled={revealed}
                className={`px-4 py-4 rounded-xl text-base font-bold transition-all border-2 ${
                  revealed
                    ? isCorrect
                      ? "border-primary bg-primary/10 text-primary"
                      : isSelected
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-transparent bg-card text-muted-foreground"
                    : "border-border bg-card hover:border-primary/40 text-foreground"
                }`}
              >
                {val ? "True" : "False"}
              </button>
            );
          })}
        </div>
      )}

      {revealed && question.explanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 border ${
            answer === (qType === "true_false" ? (question.correct ? 0 : 1) : question.correct)
              ? "bg-primary/5 border-primary/20"
              : "bg-destructive/5 border-destructive/20"
          }`}
        >
          <p className="text-sm text-foreground">
            <span className="font-semibold">
              {answer === (qType === "true_false" ? (question.correct ? 0 : 1) : question.correct)
                ? "✓ Correct! " : "✗ Not quite. "}
            </span>
            {question.explanation}
          </p>
        </motion.div>
      )}
    </div>
  );
}
