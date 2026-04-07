import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, CheckCircle, Play, ArrowLeft, Trophy, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLessons } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categories = ["All Lessons", "Voting", "Legislation", "Local Gov", "Your Rights", "Civic History"];

const categoryColors: Record<string, string> = {
  voting: "border-primary text-primary",
  legislation: "border-blue-400 text-blue-400",
  "local-gov": "border-yellow-400 text-yellow-400",
  rights: "border-pink-400 text-pink-400",
};

export default function LearnPage() {
  const { lessons, progress, loading } = useLessons();
  const { user } = useAuth();
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All Lessons");

  const completedCount = Object.values(progress).filter((p: any) => p.status === "completed").length;
  const totalXp = lessons.reduce((acc: number, l: any) => {
    const p = progress[l.id];
    return p?.status === "completed" ? acc + (l.xp_reward || 0) : acc;
  }, 0);

  const filtered = activeFilter === "All Lessons"
    ? lessons
    : lessons.filter((l: any) => l.category?.toLowerCase() === activeFilter.toLowerCase().replace(" ", "-"));

  const handleStartLesson = (lesson: any) => {
    setActiveLesson(lesson);
    setCurrentBlock(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowComplete(false);
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
      { user_id: user.id, lesson_id: activeLesson.id, status: "completed", score: passed ? 100 : 0, completed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" }
    );

    const { data: existing } = await supabase.from("civic_scores").select("*").eq("user_id", user.id).maybeSingle();
    if (existing) {
      await supabase.from("civic_scores").update({
        total_xp: existing.total_xp + activeLesson.xp_reward,
        lessons_completed: existing.lessons_completed + 1,
        quizzes_passed: existing.quizzes_passed + (passed ? 1 : 0),
        civic_literacy_score: Math.min(100, existing.civic_literacy_score + 5),
      }).eq("user_id", user.id);
    } else {
      await supabase.from("civic_scores").insert({
        user_id: user.id, total_xp: activeLesson.xp_reward, lessons_completed: 1,
        quizzes_passed: passed ? 1 : 0, civic_literacy_score: 5,
      });
    }

    setShowComplete(true);
    toast.success(`+${activeLesson.xp_reward} XP 🎓`);
  };

  // Completion modal
  if (showComplete && activeLesson) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card rounded-card p-8 text-center max-w-sm border border-border">
          <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <h2 className="font-heading text-3xl text-foreground mb-2">LESSON COMPLETE!</h2>
          <p className="text-2xl font-bold text-primary mb-4">+{activeLesson.xp_reward} XP</p>
          <Button onClick={() => { setActiveLesson(null); setShowComplete(false); }} className="w-full">Continue</Button>
        </motion.div>
      </div>
    );
  }

  // Active lesson view
  if (activeLesson) {
    const blocks = activeLesson.content?.blocks || [];
    const block = blocks[currentBlock];
    const isLastBlock = currentBlock === blocks.length - 1;
    const progressPct = ((currentBlock + 1) / blocks.length) * 100;

    return (
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted mb-6 overflow-hidden">
          <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progressPct}%` }} />
        </div>

        <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Lessons
        </button>

        <h1 className="font-heading text-4xl text-foreground mb-2">{activeLesson.title}</h1>
        <div className="flex items-center gap-3 mb-6">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-pill border ${categoryColors[activeLesson.category] || "border-border text-muted-foreground"}`}>
            {activeLesson.category}
          </span>
          <span className="text-xs text-primary font-semibold">+{activeLesson.xp_reward} XP</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentBlock} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {block?.type === "text" && (
              <div className="py-4">
                <p className="text-base text-foreground leading-relaxed">{block.content}</p>
              </div>
            )}
            {block?.type === "quiz" && (
              <div className="bg-card rounded-card p-6 border border-border space-y-4">
                <p className="text-base font-bold text-foreground">{block.question}</p>
                {block.options.map((opt: string, i: number) => {
                  const isCorrect = i === block.correct;
                  const isSelected = selectedAnswer === i;
                  return (
                    <button key={i} onClick={() => handleAnswer(i)} disabled={showResult}
                      className={`w-full text-left px-4 py-3 rounded-card text-sm font-medium transition-all border ${
                        showResult
                          ? isCorrect ? "border-primary bg-primary/10 text-primary"
                            : isSelected ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-border text-muted-foreground"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      {opt}
                      {showResult && isCorrect && <CheckCircle className="h-4 w-4 inline ml-2 text-primary" />}
                    </button>
                  );
                })}
                {showResult && (
                  <p className={`text-sm font-medium ${selectedAnswer === block.correct ? "text-primary" : "text-destructive"}`}>
                    {selectedAnswer === block.correct ? "Correct! 🎉" : "Not quite — correct answer highlighted."}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-end mt-6 gap-2">
          {!isLastBlock && block?.type !== "quiz" && (
            <Button onClick={() => { setCurrentBlock(currentBlock + 1); setSelectedAnswer(null); setShowResult(false); }}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {isLastBlock && showResult && (
            <Button onClick={handleCompleteLesson}>
              <Trophy className="h-4 w-4 mr-1" /> Complete Lesson
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-card bg-card animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-2">CIVIC EDUCATION</p>
        <h1 className="font-heading text-5xl md:text-6xl text-foreground leading-none">KNOW MORE. DO MORE.</h1>
        <p className="text-base text-muted-foreground mt-2">Nonpartisan lessons built for your community.</p>
        <div className="flex gap-3 mt-4">
          <span className="px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-foreground">{lessons.length} Total Lessons</span>
          <span className="px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-foreground">{completedCount} Completed</span>
          <span className="px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-primary">{totalXp} XP Earned</span>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveFilter(cat)}
            className={`shrink-0 px-4 py-2 rounded-pill text-sm font-medium transition-all ${
              activeFilter === cat ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >{cat}</button>
        ))}
      </div>

      {/* Lesson Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((lesson: any, i: number) => {
          const prog = progress[lesson.id];
          const isCompleted = prog?.status === "completed";
          const isInProgress = prog?.status === "in_progress";

          return (
            <motion.button key={lesson.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => handleStartLesson(lesson)}
              className="text-left bg-card rounded-card p-5 border border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground capitalize">{lesson.difficulty}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-pill border ${categoryColors[lesson.category] || "border-border text-muted-foreground"}`}>
                  {lesson.category}
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">{lesson.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{lesson.description}</p>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">+{lesson.xp_reward} XP</span>
              </div>
              {isInProgress && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                  <div className="h-full rounded-full bg-primary w-1/2" />
                </div>
              )}
              <p className="text-sm font-semibold text-primary">
                {isCompleted ? "✓ Completed" : isInProgress ? "Continue →" : "Start Lesson →"}
              </p>
            </motion.button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No lessons in this category yet.</p>
        </div>
      )}
    </div>
  );
}
