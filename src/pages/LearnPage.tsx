import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Zap, Trophy, Clock, ChevronRight,
  CheckCircle, Lock, Play, Flame
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLessonTracks } from "@/hooks/useLessonTracks";
import LessonPlayer from "@/components/learn/LessonPlayer";
import type { EnrichedLesson } from "@/hooks/useLessonTracks";

const difficultyBadge: Record<string, string> = {
  beginner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  intermediate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  advanced: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export default function LearnPage() {
  const { tracks, lessons, progress, loading, getLessonsForTrack, getTrackProgress, totalXp, completedCount } = useLessonTracks();
  const [activeLesson, setActiveLesson] = useState<EnrichedLesson | null>(null);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

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
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-xl bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6">
      {/* Hero stats */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-bold tracking-widest text-primary uppercase mb-2">Civic Education</p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground leading-none mb-1">
          LEARN. QUIZ. LEVEL UP.
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          {lessons.length} interactive lessons across {tracks.length} tracks. Nonpartisan. Evidence-based.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Zap className="h-4 w-4" />} value={`${totalXp}`} label="XP Earned" accent />
          <StatCard icon={<CheckCircle className="h-4 w-4" />} value={`${completedCount}/${lessons.length}`} label="Completed" />
          <StatCard icon={<Flame className="h-4 w-4" />} value={`${tracks.length}`} label="Tracks" />
        </div>
      </motion.div>

      {/* Tracks */}
      <div className="space-y-3">
        {tracks.map((track, idx) => {
          const trackLessons = getLessonsForTrack(track.id);
          const { completed, total, pct } = getTrackProgress(track.id);
          const isExpanded = expandedTrack === track.id;

          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              {/* Track header */}
              <button
                onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                className="w-full text-left bg-card rounded-xl border border-border hover:border-primary/30 transition-all p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{track.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-foreground text-base truncate">{track.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${difficultyBadge[track.difficulty || "beginner"]}`}>
                        {track.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{track.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground font-medium shrink-0">{completed}/{total}</span>
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </button>

              {/* Expanded lessons */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-1 space-y-1 pl-4"
                >
                  {trackLessons.map((lesson, li) => {
                    const prog = progress[lesson.id];
                    const isCompleted = prog?.status === "completed";
                    const quizCount = Array.isArray(lesson.quiz_questions) ? lesson.quiz_questions.length : 0;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        className="w-full text-left flex items-center gap-3 bg-card/50 hover:bg-card rounded-lg border border-border/50 hover:border-primary/30 transition-all p-3"
                      >
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? "bg-primary/20"
                            : "bg-muted"
                        }`}>
                          {isCompleted
                            ? <CheckCircle className="h-5 w-5 text-primary" />
                            : <span className="text-xs font-bold text-muted-foreground">{lesson.lesson_number}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isCompleted ? "text-primary" : "text-foreground"}`}>
                            {lesson.title}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
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
                        {isCompleted ? (
                          <span className="text-xs font-semibold text-primary">
                            {prog?.quiz_score ?? prog?.score ?? 0}%
                          </span>
                        ) : (
                          <Play className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}

                  {trackLessons.length === 0 && (
                    <p className="text-sm text-muted-foreground px-3 py-4">Lessons coming soon.</p>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, accent }: { icon: React.ReactNode; value: string; label: string; accent?: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 text-center">
      <div className={`flex items-center justify-center gap-1.5 mb-1 ${accent ? "text-primary" : "text-foreground"}`}>
        {icon}
        <span className="text-xl font-bold">{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
    </div>
  );
}
