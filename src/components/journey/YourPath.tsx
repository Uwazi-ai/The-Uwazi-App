import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, Clock } from "lucide-react";
import { pathLessons, type MyPath, type LessonBrief } from "@/hooks/useJourney";
import { WhyAmISeeing } from "@/components/journey/WhyAmISeeing";

const SLOT_TITLE: Record<string, (l: LessonBrief) => string> = {
  weakest: (l) => `Build up: ${l.dimension ?? "a new issue"}`,
  top: (l) => `Go deeper: ${l.dimension ?? "your top issue"}`,
  stage: () => "Next in your stage",
};

const SLOT_RULE: Record<string, (l: LessonBrief) => string> = {
  weakest: (l) => `This lesson is about ${l.dimension ?? "an issue"}. It is the issue you scored lowest on, so it helps you grow.`,
  top: (l) => `This lesson is about ${l.dimension ?? "an issue"}. It is one of your top issues, so it helps you go deeper.`,
  stage: () => "This is the next lesson for your stage. Everyone at your stage sees it.",
};

export function YourPath({ path, onOpen, compact, onChanged }: { path: MyPath | null; onOpen?: (id: string) => void; compact?: boolean; onChanged?: () => void }) {
  const items = pathLessons(path);
  if (!items.length) return null;
  const shown = compact ? items.slice(0, 1) : items;
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1">Your path</p>
        <h2 className="font-heading text-xl text-foreground">
          {compact ? "A lesson is waiting for you" : "Picked for you"}
        </h2>
        {!compact && !path?.personalization && (
          <p className="text-xs text-muted-foreground mt-1">Turn on personalizing in the Civic Compass to get lessons picked for your issues.</p>
        )}
      </div>
      <div className={compact ? "" : "grid gap-3 sm:grid-cols-3"}>
        {shown.map(({ slot, lesson }) => {
          const inner = (
            <div className="h-full text-left bg-card rounded-xl border border-border hover:border-primary/40 transition-colors p-4 flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{SLOT_TITLE[slot](lesson)}</p>
              <p className="font-semibold text-foreground leading-snug flex-1">{lesson.title}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> About {lesson.minutes || 3} minutes</span>
                <span className="flex items-center gap-1 text-primary font-semibold"><BookOpen className="h-3 w-3" /> Start <ChevronRight className="h-3 w-3" /></span>
              </div>
            </div>
          );
          return (
            <div key={lesson.id} className="flex flex-col gap-1">
              {onOpen ? (
                <button className="w-full flex-1" onClick={() => onOpen(lesson.id)} data-slot={slot}>{inner}</button>
              ) : (
                <Link to={`/app/learn?lesson=${lesson.id}`} className="block flex-1" data-slot={slot}>{inner}</Link>
              )}
              {path?.personalization && <WhyAmISeeing rule={SLOT_RULE[slot](lesson)} onChanged={onChanged} className="px-1" />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
