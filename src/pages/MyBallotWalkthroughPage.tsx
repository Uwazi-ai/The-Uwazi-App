import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PracticeBanner } from "@/components/ballot/PracticeBanner";
import { cn } from "@/lib/utils";
import {
  useVoterProfile,
  useBallotContestsForState,
  useBallotCandidates,
  useMyBallotSelections,
  useSaveSelection,
  filterContestsForParty,
  isAddressComplete,
  SUPPORTED_STATES,
  PartyKey,
  BallotCandidate,
  BallotContest,
} from "@/hooks/useMyBallot";

export default function MyBallotWalkthroughPage() {
  const navigate = useNavigate();
  const { data: profile, isLoading: pLoading } = useVoterProfile();
  const state = profile?.state_code || null;
  const party = (profile?.party_preference as PartyKey) || null;
  const { data: allContests = [], isLoading: cLoading } = useBallotContestsForState(state);
  const { data: selections = [] } = useMyBallotSelections();
  const saveSelection = useSaveSelection();

  const contests = useMemo(() => filterContestsForParty(allContests, party), [allContests, party]);
  const contestIds = useMemo(() => contests.map((c) => c.id), [contests]);
  const { data: candidates = [] } = useBallotCandidates(contestIds);

  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= contests.length && contests.length > 0) setStep(contests.length - 1);
  }, [contests.length, step]);

  if (pLoading || cLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="animate-pulse rounded-2xl h-40 bg-white/5" />
      </div>
    );
  }
  if (!profile || !isAddressComplete(profile) || !state || !SUPPORTED_STATES.includes(state)) {
    return <Navigate to="/app/my-ballot" replace />;
  }
  if (!party) return <Navigate to="/app/my-ballot" replace />;

  if (contests.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <PracticeBanner />
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h1 className="font-heading text-xl text-foreground">Nothing to walk through</h1>
          <p className="text-sm text-muted-foreground mt-2">
            There are no contested races on your {party} ballot besides the four constitutional amendments. You can
            still go to your polling place and vote on the amendments.
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/app/my-ballot"><Button variant="outline">Change party</Button></Link>
            <Link to="/app/vote"><Button className="bg-primary text-primary-foreground">Back to Voting Hub</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const contest = contests[step];
  const selection = selections.find((s) => s.contest_id === contest.id);
  const contestCandidates = candidates.filter((c) => c.contest_id === contest.id);

  const onCandidatePick = async (cand: BallotCandidate | null) => {
    await saveSelection.mutateAsync({
      contest_id: contest.id,
      candidate_id: cand?.id ?? null,
      measure_vote: null,
      party_snapshot: party,
    });
  };
  const onMeasurePick = async (vote: "yes" | "no" | "undecided") => {
    await saveSelection.mutateAsync({
      contest_id: contest.id,
      candidate_id: null,
      measure_vote: vote,
      party_snapshot: party,
    });
  };
  const onUndecidedCandidate = async () => {
    await saveSelection.mutateAsync({
      contest_id: contest.id,
      candidate_id: null,
      measure_vote: "undecided",
      party_snapshot: party,
    });
  };

  const goPrev = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => {
    if (step + 1 >= contests.length) navigate("/app/my-ballot/review");
    else setStep((s) => s + 1);
  };

  const progressPct = Math.round(((step + 1) / contests.length) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-10 space-y-5">
      <Helmet>
        <title>Build My Ballot — UWAZI</title>
      </Helmet>

      <PracticeBanner />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {step + 1} of {contests.length}
        </span>
        <Link to="/app/vote" className="hover:text-foreground">
          Save and finish later
        </Link>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={contest.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl p-5 md:p-6"
          style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-xs tracking-widest uppercase text-muted-foreground">
            {contest.contest_type === "ballot_measure" ? "Ballot Measure" : "Candidate Race"}
          </p>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground mt-1" style={{ letterSpacing: "-0.01em" }}>
            {contest.measure_title}
          </h1>

          {contest.contest_type === "candidate_race" ? (
            <CandidateChooser
              contest={contest}
              candidates={contestCandidates}
              selectedCandidateId={selection?.candidate_id || null}
              selectedUndecided={selection?.measure_vote === "undecided"}
              onPick={onCandidatePick}
              onUndecided={onUndecidedCandidate}
            />
          ) : (
            <MeasureChooser
              contest={contest}
              selectedVote={(selection?.measure_vote as any) || null}
              onPick={onMeasurePick}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={goPrev} disabled={step === 0} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={goNext} className="bg-primary text-primary-foreground gap-1.5">
          {step + 1 >= contests.length ? "Review" : "Next"} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CandidateChooser({
  contest,
  candidates,
  selectedCandidateId,
  selectedUndecided,
  onPick,
  onUndecided,
}: {
  contest: BallotContest;
  candidates: BallotCandidate[];
  selectedCandidateId: string | null;
  selectedUndecided: boolean;
  onPick: (c: BallotCandidate) => void;
  onUndecided: () => void;
}) {
  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground mt-4">
        Candidate list is being finalized. Check back before Election Day.
      </p>
    );
  }
  return (
    <div className="mt-4 space-y-2">
      {contest.plain_summary && (
        <p className="text-sm text-muted-foreground pb-2">{contest.plain_summary}</p>
      )}
      {candidates.map((c) => {
        const selected = selectedCandidateId === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className={cn(
              "w-full text-left rounded-xl p-4 border transition-colors bg-white/[0.02]",
              selected ? "border-primary" : "border-white/10 hover:border-white/25",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {c.party || "—"}
                  {c.is_incumbent && (
                    <span className="ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary border border-primary/40">
                      Incumbent
                    </span>
                  )}
                </div>
              </div>
              {selected && <span className="text-xs font-semibold text-primary">Selected</span>}
            </div>
          </button>
        );
      })}
      <button
        onClick={onUndecided}
        className={cn(
          "w-full text-left rounded-xl p-4 border transition-colors bg-white/[0.02] flex items-center gap-2",
          selectedUndecided ? "border-primary" : "border-white/10 hover:border-white/25",
        )}
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground">Still deciding</span>
        {selectedUndecided && <span className="ml-auto text-xs font-semibold text-primary">Selected</span>}
      </button>
    </div>
  );
}

function MeasureChooser({
  contest,
  selectedVote,
  onPick,
}: {
  contest: BallotContest;
  selectedVote: "yes" | "no" | "undecided" | null;
  onPick: (v: "yes" | "no" | "undecided") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-4 space-y-3">
      {contest.plain_summary && (
        <p className="text-sm text-foreground/90 leading-relaxed">{contest.plain_summary}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <VoteButton label="Yes" hint={contest.yes_means} active={selectedVote === "yes"} onClick={() => onPick("yes")} />
        <VoteButton label="No" hint={contest.no_means} active={selectedVote === "no"} onClick={() => onPick("no")} />
      </div>

      <button
        onClick={() => onPick("undecided")}
        className={cn(
          "w-full text-left rounded-xl p-4 border transition-colors bg-white/[0.02] flex items-center gap-2",
          selectedVote === "undecided" ? "border-primary" : "border-white/10 hover:border-white/25",
        )}
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground">Still deciding</span>
      </button>

      {contest.measure_summary && (
        <div className="pt-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-sm text-primary hover:underline"
          >
            {expanded ? "Hide" : "Read"} the official ballot language
          </button>
          {expanded && (
            <div className="mt-2 rounded-lg p-3 text-sm text-muted-foreground border border-white/10 bg-white/[0.02] whitespace-pre-wrap">
              {contest.measure_summary}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VoteButton({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl p-4 border text-left transition-colors bg-white/[0.02]",
        active ? "border-primary" : "border-white/10 hover:border-white/25",
      )}
    >
      <div className="font-heading text-lg text-foreground">{label}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1 leading-snug">{hint}</div>}
    </button>
  );
}
