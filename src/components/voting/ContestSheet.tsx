import { ExternalLink, HelpCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  BallotContest,
  useBallotCandidates,
  useMyBallotSelections,
  useSaveSelection,
} from "@/hooks/useMyBallot";

/** One contest, opened from the Voting Hub ballot tiles. Races show candidates. Questions show plain words. */
export default function ContestSheet({
  contest,
  party,
  onClose,
}: {
  contest: BallotContest | null;
  party: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!contest} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92dvh] overflow-y-auto bg-background p-0">
        {contest && <ContestBody contest={contest} party={party} />}
      </SheetContent>
    </Sheet>
  );
}

function ContestBody({ contest, party }: { contest: BallotContest; party: string | null }) {
  const isRace = contest.contest_type === "candidate_race";
  const { data: candidates = [] } = useBallotCandidates(isRace ? [contest.id] : []);
  const { data: selections = [] } = useMyBallotSelections();
  const save = useSaveSelection();
  const selection = selections.find((s) => s.contest_id === contest.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-5 py-6 pb-20">
      <SheetHeader className="text-left">
        <SheetTitle asChild>
          <h2 className="font-heading text-2xl text-foreground">{contest.measure_title}</h2>
        </SheetTitle>
      </SheetHeader>

      {contest.plain_summary && (
        <section className="rounded-[20px] border border-primary/30 bg-primary/10 p-5">
          <p className="eyebrow mb-2">In plain words</p>
          <p className="text-base leading-relaxed text-foreground">{contest.plain_summary}</p>
        </section>
      )}

      {isRace ? (
        <section>
          <p className="text-sm text-muted-foreground">
            Pick one to save it to your ballot. You can change it any time.
          </p>
          <div className="mt-3 space-y-2">
            {candidates.length === 0 && (
              <p className="text-sm text-muted-foreground">The candidate list is still being checked.</p>
            )}
            {candidates.map((c) => {
              const picked = selection?.candidate_id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    save.mutate({ contest_id: contest.id, candidate_id: c.id, measure_vote: null, party_snapshot: party })
                  }
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    picked ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className="block text-sm font-medium text-foreground">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.party || "No party listed"}
                    {c.is_incumbent ? ". In office now" : ""}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() =>
                save.mutate({ contest_id: contest.id, candidate_id: null, measure_vote: "undecided", party_snapshot: party })
              }
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-colors",
                selection?.measure_vote === "undecided" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
              )}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Still deciding</span>
            </button>
          </div>
        </section>
      ) : (
        <>
          <section>
            <h3 className="font-heading text-lg text-foreground">What your vote means</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="eyebrow mb-1">Vote yes</p>
                <p className="text-sm text-foreground">{contest.yes_means || "We are still adding this."}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="eyebrow mb-1">Vote no</p>
                <p className="text-sm text-foreground">{contest.no_means || "We are still adding this."}</p>
              </div>
            </div>
          </section>
          <section>
            <p className="text-sm text-muted-foreground">Save your choice.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["yes", "no", "undecided"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => save.mutate({ contest_id: contest.id, candidate_id: null, measure_vote: v })}
                  className={cn(
                    "rounded-xl border py-3 text-sm font-semibold transition-colors",
                    selection?.measure_vote === v ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground",
                  )}
                >
                  {v === "yes" ? "Yes" : v === "no" ? "No" : "Still deciding"}
                </button>
              ))}
            </div>
          </section>
          {contest.measure_summary && (
            <section>
              <p className="eyebrow mb-2">The words on the ballot</p>
              <div className="rounded-xl border border-dashed border-border p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{contest.measure_summary}</p>
              </div>
            </section>
          )}
        </>
      )}

      <footer className="flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
        {contest.source_url && (
          <a href={contest.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary">
            {contest.source_name || "Source"} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {contest.measure_full_text_url && (
          <a href={contest.measure_full_text_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary">
            Read the full text <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </footer>
    </div>
  );
}
