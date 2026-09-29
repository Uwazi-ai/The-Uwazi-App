import { Link } from "react-router-dom";
import { Trophy, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countPhrase, COUNT_STEP, type MyChallenge } from "@/hooks/useChallenge";

function daysLeft(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d <= 0 ? "Ends today" : d === 1 ? "1 day left" : `${d} days left`;
}

export function ChallengeStanding({ c }: { c: MyChallenge }) {
  if (c.winning_zip) {
    return (
      <p className="text-sm text-muted-foreground">
        {c.i_won
          ? `Your ZIP won. You earned the ZIP Champion badge.`
          : `${c.winning_zip} won this one. You still moved your ZIP forward.`}
      </p>
    );
  }
  if (!c.my_zip) {
    return <p className="text-sm text-muted-foreground">Add your ZIP code in Settings to join the board.</p>;
  }
  if (!c.zip_shown) {
    return (
      <p className="text-sm text-muted-foreground">
        {c.my_zip} needs 10 people taking part to show on the board. Every person you bring helps.
      </p>
    );
  }
  const pct = Math.round(Number(c.zip_rate ?? 0) * 100);
  return (
    <p className="text-sm text-muted-foreground" data-testid="zip-standing">
      {c.my_zip} is number {c.zip_rank} of {c.board_size}. {pct} out of 100 people here took part, with {c.zip_total} in total.
    </p>
  );
}

export function ChallengeCard({ c }: { c: MyChallenge }) {
  const step = COUNT_STEP[c.counts_what];
  const live = c.active && !c.ended_at;
  return (
    <section className="rounded-2xl p-5 border border-primary/30 bg-primary/10 space-y-3" data-testid="challenge-card">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">CIVIC GAMES</p>
        {live && <span className="ml-auto text-xs text-muted-foreground">{daysLeft(c.ends_at)}</span>}
      </div>
      <div>
        <h2 className="font-heading text-xl text-foreground leading-tight">{c.title}</h2>
        {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
      </div>
      <p className="text-sm text-foreground">
        You have {countPhrase(c.my_count, c.counts_what)} in this challenge.
      </p>
      <ChallengeStanding c={c} />
      {live && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild>
            <Link to={step.to}>{step.text} <ChevronRight className="h-4 w-4 ml-1" /></Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/app/ask?q=${encodeURIComponent(`How can I help my ZIP in the ${c.title} challenge?`)}`}>
              <MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
