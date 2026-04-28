import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Zap, Clock, ChevronRight, ChevronDown,
  CheckCircle, Lock, Play, Flame
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLessonTracks } from "@/hooks/useLessonTracks";
import LessonPlayer from "@/components/learn/LessonPlayer";
import type { EnrichedLesson } from "@/hooks/useLessonTracks";

const difficultyConfig: Record<string, { label: string; class: string }> = {
  beginner: { label: "Beginner", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  intermediate: { label: "Intermediate", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  advanced: { label: "Advanced", class: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

export default function LearnPage() {
  const { tracks, lessons, progress, loading, getLessonsForTrack, getTrackProgress, totalXp, completedCount } = useLessonTracks();
  const [activeLesson, setActiveLesson] = useState<EnrichedLesson | null>(null);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  const tracksStarted = tracks.filter(t => getTrackProgress(t.id).completed > 0).length;
  const literacyScore = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  if (activeLesson) {
    return (
      <LessonPlayer
        lesson={activeLesson}
        onClose={() => setActiveLesson(null)}
        onComplete={() => setActiveLesson(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-28 rounded-xl bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-5xl mx-auto px-3 sm:px-4 md:px-8 py-5 md:py-8 pb-24 md:pb-8 space-y-6 sm:space-y-8 min-h-screen overflow-x-hidden"
      style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
    >
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[11px] sm:text-xs font-bold tracking-widest text-primary uppercase mb-2">Civic Education</p>
        <h1 className="font-heading text-2xl sm:text-4xl md:text-5xl text-foreground leading-tight mb-1 break-words">
          KNOW MORE. DO MORE.
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-5">
          Nonpartisan lessons built for your community.
        </p>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
          <StatCard icon={<Zap className="h-4 w-4" />} value={`${totalXp}`} label="XP Earned" accent />
          <StatCard icon={<BookOpen className="h-4 w-4" />} value={`${completedCount}`} label="Lessons" />
          <StatCard icon={<Flame className="h-4 w-4" />} value={`${tracksStarted}`} label="Tracks Started" />
        </div>

        {/* Civic Literacy Score bar */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Your Civic Literacy Score</span>
            <a href="/progress" className="text-xs font-medium text-primary hover:underline">View Progress →</a>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={literacyScore} className="h-2.5 flex-1" />
            <span className="text-sm font-bold text-foreground shrink-0">{literacyScore}/100</span>
          </div>
        </div>
      </motion.div>

      {/* Track Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tracks.map((track, idx) => {
          const trackLessons = getLessonsForTrack(track.id);
          const { completed, total, pct } = getTrackProgress(track.id);
          const isExpanded = expandedTrack === track.id;
          const diff = difficultyConfig[track.difficulty || "beginner"];
          const isDone = completed === total && total > 0;
          const ctaLabel = completed === 0 ? "Start →" : isDone ? "✓ Complete" : "Continue →";

          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`${isExpanded ? "sm:col-span-2" : ""}`}
            >
              {/* Track Card */}
              <button
                onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                className="w-full text-left bg-card rounded-xl border border-border hover:border-primary/30 transition-all overflow-hidden"
                style={{ borderLeftWidth: 4, borderLeftColor: track.color || "hsl(var(--primary))" }}
              >
                <div className="p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3">
                  <span className="text-2xl sm:text-3xl leading-none mt-0.5 shrink-0">{track.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-foreground text-sm sm:text-base break-words min-w-0">{track.name}</h3>
                      <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border uppercase shrink-0 ${diff.class}`}>
                        {diff.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1 mb-2.5">{track.description}</p>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-0">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: track.color || "hsl(var(--primary))" }}
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium shrink-0 whitespace-nowrap">
                        {completed}/{total}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0 ml-1 sm:ml-2">
                    <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg whitespace-nowrap ${isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {ctaLabel}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </button>

              {/* Expanded Lesson List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 pb-1 space-y-1.5 pl-2">
                      {trackLessons.map((lesson, li) => {
                        const prog = progress[lesson.id];
                        const isCompleted = prog?.status === "completed";
                        // Lock if previous lesson in same track not completed (except first)
                        const prevLesson = li > 0 ? trackLessons[li - 1] : null;
                        const prevCompleted = prevLesson ? progress[prevLesson.id]?.status === "completed" : true;
                        const isLocked = li > 0 && !prevCompleted && !isCompleted;
                        const quizCount = Array.isArray(lesson.quiz_questions) ? lesson.quiz_questions.length : 0;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => !isLocked && setActiveLesson(lesson)}
                            disabled={isLocked}
                            className={`w-full text-left flex items-center gap-3 rounded-lg border transition-all p-3 ${
                              isLocked
                                ? "bg-muted/30 border-border/30 opacity-60 cursor-not-allowed"
                                : isCompleted
                                ? "bg-primary/5 border-primary/20 hover:border-primary/40"
                                : "bg-card/60 border-border/50 hover:bg-card hover:border-primary/30"
                            }`}
                          >
                            {/* Lesson number circle */}
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                              isCompleted
                                ? "bg-primary/20"
                                : isLocked
                                ? "bg-muted/50"
                                : "bg-muted"
                            }`}>
                              {isCompleted ? (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              ) : isLocked ? (
                                <Lock className="h-4 w-4 text-muted-foreground/50" />
                              ) : (
                                <span className="text-xs font-bold text-muted-foreground">{lesson.lesson_number}</span>
                              )}
                            </div>

                            {/* Lesson info */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${
                                isCompleted ? "text-primary" : isLocked ? "text-muted-foreground/60" : "text-foreground"
                              }`}>
                                {lesson.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{lesson.description}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {lesson.estimated_minutes}m
                                </span>
                                <span className="flex items-center gap-1">
                                  <Zap className="h-3 w-3 text-primary" />
                                  +{lesson.xp_reward} XP
                                </span>
                                {quizCount > 0 && (
                                  <span>{quizCount} questions</span>
                                )}
                              </div>
                            </div>

                            {/* Right action */}
                            <div className="shrink-0">
                              {isCompleted ? (
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                                  {prog?.quiz_score ?? prog?.score ?? 0}%
                                </span>
                              ) : isLocked ? (
                                <Lock className="h-4 w-4 text-muted-foreground/40" />
                              ) : (
                                <Play className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>
                        );
                      })}

                      {trackLessons.length === 0 && (
                        <p className="text-sm text-muted-foreground px-3 py-6 text-center">Lessons coming soon.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, accent }: { icon: React.ReactNode; value: string; label: string; accent?: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border p-2.5 sm:p-3 text-center min-w-0">
      <div className={`flex items-center justify-center gap-1 sm:gap-1.5 mb-1 ${accent ? "text-primary" : "text-foreground"}`}>
        {icon}
        <span className="text-lg sm:text-xl font-bold truncate">{value}</span>
      </div>
      <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate">{label}</p>
    </div>
  );
}
