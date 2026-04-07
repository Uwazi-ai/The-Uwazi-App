import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Clock, Zap, ChevronRight, CheckCircle, Lock, Play, ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLessons } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categoryColors: Record<string, string> = {
  voting: "bg-primary/10 text-primary",
  legislation: "bg-secondary/10 text-secondary",
  "local-gov": "bg-accent/10 text-accent",
  rights: "bg-civic-coral/10 text-civic-coral",
};

const difficultyIcons: Record<string, string> = {
  beginner: "🌱",
  intermediate: "📚",
  advanced: "🎯",
};

export default function LearnPage() {
  const { lessons, progress, loading } = useLessons();
  const { user } = useAuth();
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const completedCount = Object.values(progress).filter((p: any) => p.status === "completed").length;

  const handleStartLesson = (lesson: any) => {
    setActiveLesson(lesson);
    setCurrentBlock(0);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
  };

  const handleCompleteLesson = async () => {
    if (!user || !activeLesson) return;
    const blocks = activeLesson.content?.blocks || [];
    const quiz = blocks.find((b: any) => b.type === "quiz");
    const passed = quiz && selectedAnswer === quiz.correct;

    await supabase.from("user_lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: activeLesson.id,
        status: "completed",
        score: passed ? 100 : 0,
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

    if (existing) {
      await supabase
        .from("civic_scores")
        .update({
          total_xp: existing.total_xp + activeLesson.xp_reward,
          lessons_completed: existing.lessons_completed + 1,
          quizzes_passed: existing.quizzes_passed + (passed ? 1 : 0),
          civic_literacy_score: Math.min(100, existing.civic_literacy_score + 5),
        })
        .eq("user_id", user.id);
    } else {
      await supabase.from("civic_scores").insert({
        user_id: user.id,
        total_xp: activeLesson.xp_reward,
        lessons_completed: 1,
        quizzes_passed: passed ? 1 : 0,
        civic_literacy_score: 5,
      });
    }

    toast.success(`+${activeLesson.xp_reward} XP earned! 🎉`);
    setActiveLesson(null);
  };

  // Active lesson view
  if (activeLesson) {
    const blocks = activeLesson.content?.blocks || [];
    const block = blocks[currentBlock];
    const isLastBlock = currentBlock === blocks.length - 1;

    return (
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Lessons
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{difficultyIcons[activeLesson.difficulty] || "📖"}</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${categoryColors[activeLesson.category] || "bg-muted text-muted-foreground"}`}>
              {activeLesson.category}
            </span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">{activeLesson.title}</h1>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted my-4 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${((currentBlock + 1) / blocks.length) * 100}%` }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={currentBlock} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {block?.type === "text" && (
                <div className="py-4">
                  <p className="text-sm text-foreground leading-relaxed">{block.content}</p>
                </div>
              )}

              {block?.type === "quiz" && (
                <div className="py-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground mb-4">{block.question}</p>
                  {block.options.map((opt: string, i: number) => {
                    const isCorrect = i === block.correct;
                    const isSelected = selectedAnswer === i;
                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={showResult}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                          showResult
                            ? isCorrect
                              ? "border-primary bg-primary/10 text-primary"
                              : isSelected
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : "border-border text-muted-foreground"
                            : "border-border hover:border-primary/50 hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                            {String.fromCharCode(65 + i)}
                          </span>
                          {opt}
                          {showResult && isCorrect && <CheckCircle className="h-4 w-4 ml-auto text-primary" />}
                        </span>
                      </button>
                    );
                  })}
                  {showResult && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-sm font-medium mt-2 ${selectedAnswer === block.correct ? "text-primary" : "text-destructive"}`}>
                      {selectedAnswer === block.correct ? "Correct! 🎉" : "Not quite — the correct answer is highlighted above."}
                    </motion.p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-end mt-4 gap-2">
            {!isLastBlock && block?.type !== "quiz" && (
              <Button onClick={() => { setCurrentBlock(currentBlock + 1); setSelectedAnswer(null); setShowResult(false); }} className="gap-1.5">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {isLastBlock && showResult && (
              <Button onClick={handleCompleteLesson} className="gap-1.5">
                <Trophy className="h-4 w-4" /> Complete Lesson
              </Button>
            )}
            {block?.type === "text" && !isLastBlock && null}
            {block?.type === "quiz" && !showResult && null}
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Civic Lessons
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build your civic literacy, one lesson at a time
        </p>
      </motion.div>

      {/* Progress summary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-4"
      >
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{completedCount} of {lessons.length} completed</p>
          <div className="h-2 rounded-full bg-muted mt-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${lessons.length ? (completedCount / lessons.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </motion.div>

      {/* Lesson list */}
      <div className="space-y-3">
        {lessons.map((lesson, i) => {
          const prog = progress[lesson.id];
          const isCompleted = prog?.status === "completed";

          return (
            <motion.button
              key={lesson.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              onClick={() => handleStartLesson(lesson)}
              className="w-full text-left bg-card rounded-2xl p-4 shadow-card hover:shadow-elevated transition-all flex items-center gap-4"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                isCompleted ? "bg-primary/10" : "bg-muted"
              }`}>
                {isCompleted ? (
                  <CheckCircle className="h-6 w-6 text-primary" />
                ) : (
                  <Play className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${categoryColors[lesson.category] || "bg-muted text-muted-foreground"}`}>
                    {lesson.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{difficultyIcons[lesson.difficulty] || ""} {lesson.difficulty}</span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">{lesson.title}</p>
                <p className="text-xs text-muted-foreground truncate">{lesson.description}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold text-accent">{lesson.xp_reward}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
