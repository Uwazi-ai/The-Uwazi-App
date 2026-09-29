import { Link, useNavigate } from "react-router-dom";
import { IdentityCard } from "@/components/compass/IdentityCard";
import { Compass, ChevronRight, MessageCircle, TrendingUp, History, Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMyJourney, EVENT_LABELS, type MyJourney } from "@/hooks/useJourney";
import { useMyChallenge, useMyBadges, COUNT_LABELS } from "@/hooks/useChallenge";
import { ChallengeStanding } from "@/components/games/ChallengeCard";
import { BadgeRow } from "@/components/games/BadgeRow";
import { Trophy, Award } from "lucide-react";

const db = supabase as any;

function stepInfo(step: MyJourney["next_step"]): { title: string; sub: string; to: string | null; action?: "civic" } {
  if (!step) return { title: "Explore My City", sub: "See what is happening near you.", to: "/app/my-city" };
  switch (step.type) {
    case "compass":
      return { title: "Take the Civic Compass quiz", sub: "It takes about 3 minutes. You earn 50 points.", to: "/app/compass" };
    case "survey":
      return { title: step.title ? `Answer: ${step.title}` : "Answer a short survey", sub: "Your voice helps your community. You earn 15 points.", to: "/app/home" };
    case "lesson":
      return { title: step.title ? `Start: ${step.title}` : "Start your next lesson", sub: "A short lesson. You earn 25 points.", to: `/app/learn?lesson=${step.ref}` };
    case "office_action":
      return { title: step.title ? `Reach out to ${step.title}` : "Reach out to a local leader", sub: "Call, email, or go to a meeting. Then tap below. You earn 30 points.", to: null, action: "civic" };
    default:
      return { title: "Explore My City", sub: "See what is happening near you.", to: "/app/my-city" };
  }
}

function ConfidenceTrend({ points }: { points: { score: number; at: string }[] }) {
  if (!points.length) {
    return <p className="text-sm text-muted-foreground">No check ins yet. Ask UWAZI will sometimes ask you a quick question to see how sure you feel.</p>;
  }
  const w = 280, h = 60;
  const xs = points.map((_, i) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w));
  const ys = points.map((p) => h - Number(p.score) * h);
  const last = Math.round(Number(points[points.length - 1].score) * 100);
  return (
    <div className="space-y-2">
      <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="w-full h-16" aria-label="Confidence over time">
        <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" points={xs.map((x, i) => `${x},${ys[i]}`).join(" ")} />
        {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="3.5" fill="hsl(var(--primary))" />)}
      </svg>
      <p className="text-sm text-muted-foreground">Latest: {last} out of 100 from {points.length} check {points.length === 1 ? "in" : "ins"}.</p>
    </div>
  );
}

export default function ProgressPage() {
  const { journey, loading, reload } = useMyJourney();
  const { challenge } = useMyChallenge();
  const badges = useMyBadges();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />)}
      </div>
    );
  }
  if (!journey) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center space-y-3">
        <p className="text-muted-foreground">We could not load your journey right now.</p>
        <Button onClick={reload}>Try again</Button>
      </div>
    );
  }

  const step = stepInfo(journey.next_step);
  const span = journey.next_stage_points != null ? journey.next_stage_points : journey.total_points;
  const pct = journey.next_stage_points ? Math.min(100, (journey.total_points / journey.next_stage_points) * 100) : 100;

  const logAction = async () => {
    const { data, error } = await db.rpc("log_civic_action", { _office_id: journey.next_step?.ref ?? null });
    if (error) return toast.error("We could not save that. Try again.");
    if (!data?.ok) return toast.message("You already logged an action this week. Come back next week.");
    toast.success("+30 points. Thank you for showing up.");
    reload();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-5 overflow-x-hidden">
      <div className="rounded-2xl p-6 border border-primary/20 bg-primary/5">
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary mb-2">YOUR CIVIC JOURNEY</p>
        {journey.personalization && journey.label ? (
          <>
            <h1 className="font-heading text-3xl md:text-4xl text-foreground leading-tight">{journey.label}</h1>
            {journey.lead_name && <p className="text-sm text-muted-foreground mt-1">You lead with {journey.lead_name}.</p>}
          </>
        ) : (
          <h1 className="font-heading text-3xl md:text-4xl text-foreground leading-tight">Your progress</h1>
        )}
      </div>

      {journey.personalization && journey.label && journey.dimension_scores && (
        <IdentityCard label={journey.label} scores={journey.dimension_scores} stage={journey.stage} />
      )}

      <div className="rounded-2xl p-5 bg-card border border-border space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Stage</p>
            <p className="text-2xl font-bold text-foreground" data-testid="stage-name">{journey.stage}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Points</p>
            <p className="text-2xl font-bold text-primary" data-testid="total-points">{journey.total_points}</p>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {journey.next_stage ? `${span - journey.total_points} more points to reach ${journey.next_stage}.` : "You reached the top stage. Keep going."}
        </p>
      </div>

      {challenge && (
        <div className="rounded-2xl p-5 bg-card border border-border space-y-2" data-testid="progress-challenge">
          <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">{challenge.title}</h2></div>
          <p className="text-sm text-foreground">You have {challenge.my_count} {COUNT_LABELS[challenge.counts_what]} in this challenge.</p>
          <ChallengeStanding c={challenge} />
        </div>
      )}

      {badges.length > 0 && (
        <div className="rounded-2xl p-5 bg-card border border-border space-y-3">
          <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Your badges</h2></div>
          <BadgeRow badges={badges} />
        </div>
      )}

      {journey.personalization && (
        <div className="rounded-2xl p-5 bg-card border border-border space-y-2">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">How sure you feel</h2></div>
          <ConfidenceTrend points={journey.confidence ?? []} />
        </div>
      )}

      <Link to={journey.latest_compass_at ? "/app/compass?view=latest" : "/app/compass"} className="flex items-center gap-3 rounded-2xl p-5 bg-card border border-border hover:border-primary/40 transition-colors">
        <Compass className="h-6 w-6 text-primary shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-foreground">Civic Compass</p>
          <p className="text-sm text-muted-foreground">{journey.latest_compass_at ? "See your latest result." : "Find the issues you care about most."}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <div className="rounded-2xl p-5 bg-card border border-border space-y-3">
        <div className="flex items-center gap-2"><History className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">What you have done</h2></div>
        {journey.history.length ? (
          <ul className="divide-y divide-border">
            {journey.history.map((h, i) => (
              <li key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-foreground">{EVENT_LABELS[h.event] ?? "Earned points"}</p>
                  {h.title && <p className="text-xs text-muted-foreground truncate">{h.title}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(h.at).toLocaleDateString()}</p>
                </div>
                <span className="font-bold text-primary shrink-0">+{h.points}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing yet. Your first step is below.</p>
        )}
      </div>

      <div className="rounded-2xl p-5 border border-primary/30 bg-primary/10 space-y-3">
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">YOUR NEXT STEP</p>
        <p className="font-semibold text-foreground">{step.title}</p>
        <p className="text-sm text-muted-foreground">{step.sub}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          {step.action === "civic" ? (
            <Button onClick={logAction}><Flag className="h-4 w-4 mr-1" /> I took action</Button>
          ) : (
            <Button onClick={() => step.to && navigate(step.to)} data-testid="next-step">Go to next step <ChevronRight className="h-4 w-4 ml-1" /></Button>
          )}
          <Button asChild variant="outline">
            <Link to={`/app/ask?q=${encodeURIComponent("What is a good next step for me to get involved in my city?")}`}>
              <MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
