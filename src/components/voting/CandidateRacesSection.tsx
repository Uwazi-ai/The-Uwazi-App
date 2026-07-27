import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight, HelpCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useBallotContestsForState,
  useBallotCandidates,
  useMyBallotSelections,
  useSaveSelection,
  filterContestsForParty,
  PartyKey,
  BallotCandidate,
  BallotContest,
} from "@/hooks/useMyBallot";

export function CandidateRacesSection({
  state,
  partyPreference,
}: {
  state: string;
  partyPreference: string | null;
}) {
  const party = (partyPreference as PartyKey) || null;
  const { data: allContests = [], isLoading } = useBallotContestsForState(state);
  const contests = useMemo(
    () => filterContestsForParty(allContests, party).filter((c) => c.contest_type === "candidate_race"),
    [allContests, party],
  );
  const ids = useMemo(() => contests.map((c) => c.id), [contests]);
  const { data: candidates = [] } = useBallotCandidates(ids);
  const { data: selections = [] } = useMyBallotSelections();
  const save = useSaveSelection();

  if (!party || party === "unaffiliated" || party === "not_sure") {
    return null;
  }

  if (isLoading) {
    return <div className="rounded-2xl h-24 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />;
  }

  if (contests.length === 0) return null;

  const onPickCandidate = (contest: BallotContest, cand: BallotCandidate) => {
    save.mutate({
      contest_id: contest.id,
      candidate_id: cand.id,
      measure_vote: null,
      party_snapshot: party,
    });
  };
  const onUndecided = (contest: BallotContest) => {
    save.mutate({
      contest_id: contest.id,
      candidate_id: null,
      measure_vote: "undecided",
      party_snapshot: party,
    });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2 gap-3">
        <h2 className="font-heading text-xl md:text-2xl text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Your primary races
        </h2>
        <Link to="/app/my-ballot" className="text-xs text-primary hover:underline whitespace-nowrap">
          Full walkthrough <ChevronRight className="inline h-3 w-3" />
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Pick a candidate to save it to your ballot, or tap "Still deciding". Selections sync with your printable ballot.
      </p>

      <div className="space-y-3">
        {contests.map((contest) => {
          const contestCandidates = candidates.filter((c) => c.contest_id === contest.id);
          const selection = selections.find((s) => s.contest_id === contest.id);
          return (
            <RaceCard
              key={contest.id}
              contest={contest}
              candidates={contestCandidates}
              selectedCandidateId={selection?.candidate_id || null}
              undecided={selection?.measure_vote === "undecided"}
              onPick={(cand) => onPickCandidate(contest, cand)}
              onUndecided={() => onUndecided(contest)}
            />
          );
        })}
      </div>

      <div className="mt-4">
        <Link to="/app/my-ballot/review">
          <Button variant="outline" size="sm">Review my ballot</Button>
        </Link>
      </div>
    </section>
  );
}

function RaceCard({
  contest,
  candidates,
  selectedCandidateId,
  undecided,
  onPick,
  onUndecided,
}: {
  contest: BallotContest;
  candidates: BallotCandidate[];
  selectedCandidateId: string | null;
  undecided: boolean;
  onPick: (c: BallotCandidate) => void;
  onUndecided: () => void;
}) {
  const anyChoice = !!selectedCandidateId || undecided;

  return (
    <div
      className="rounded-2xl p-5 relative"
      style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: "#9BD34B" }} aria-hidden />
      <div className="pl-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-lg text-foreground">{contest.measure_title}</h3>
          {anyChoice && <CheckCircle2 className="h-4 w-4 text-primary mt-1 flex-shrink-0" aria-label="Saved" />}
        </div>
        {contest.plain_summary && (
          <p className="text-sm text-muted-foreground mt-1">{contest.plain_summary}</p>
        )}

        {candidates.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-3 italic">Candidate list being finalized.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {candidates.map((c) => {
              const selected = selectedCandidateId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onPick(c)}
                  className={cn(
                    "w-full text-left rounded-xl p-3 border transition-colors bg-white/[0.02]",
                    selected ? "border-primary" : "border-white/10 hover:border-white/25",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.party || "—"}
                        {c.is_incumbent && (
                          <span className="ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary border border-primary/40">
                            Incumbent
                          </span>
                        )}
                      </div>
                    </div>
                    {selected && <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">Selected</span>}
                  </div>
                </button>
              );
            })}
            <button
              onClick={onUndecided}
              className={cn(
                "w-full text-left rounded-xl p-3 border transition-colors bg-white/[0.02] flex items-center gap-2",
                undecided ? "border-primary" : "border-white/10 hover:border-white/25",
              )}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Still deciding</span>
              {undecided && <span className="ml-auto text-[10px] font-semibold text-primary uppercase tracking-widest">Selected</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
