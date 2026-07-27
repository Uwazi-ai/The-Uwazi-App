import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useBallotContestsForState,
  useMyBallotSelections,
  filterContestsForParty,
  PartyKey,
} from "@/hooks/useMyBallot";

export function MyBallotCard({
  state,
  partyPreference,
}: {
  state: string;
  partyPreference: string | null;
}) {
  const { data: contests = [] } = useBallotContestsForState(state);
  const { data: selections = [] } = useMyBallotSelections();

  const party = (partyPreference as PartyKey) || null;
  const relevantContests = filterContestsForParty(contests, party);
  const relevantIds = new Set(relevantContests.map((c) => c.id));
  const relevantSelections = selections.filter((s) => relevantIds.has(s.contest_id));
  const total = relevantContests.length;
  const decided = relevantSelections.filter(
    (s) => (s.candidate_id && s.candidate_id.length > 0) || (s.measure_vote && s.measure_vote !== "undecided"),
  ).length;
  const undecided = total - decided;

  let stateKey: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" = "NOT_STARTED";
  if (relevantSelections.length > 0 && relevantSelections.length < total) stateKey = "IN_PROGRESS";
  if (relevantSelections.length >= total && total > 0) stateKey = "COMPLETE";

  const card =
    "rounded-2xl p-5 md:p-6";
  const style = {
    background: "var(--card-bg, rgba(255,255,255,0.03))",
    border: "1px solid rgba(255,255,255,0.08)",
  } as const;

  if (stateKey === "NOT_STARTED") {
    return (
      <div className={card} style={style}>
        <div className="flex items-start gap-3">
          <div className="rounded-xl p-2" style={{ background: "rgba(155,211,75,0.12)" }}>
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-lg md:text-xl text-foreground">Build your ballot</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Walk through your August 4 ballot and print it to take with you.
            </p>
            <Link to="/app/my-ballot">
              <Button className="mt-4 bg-primary text-primary-foreground gap-1.5">
                Start <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (stateKey === "IN_PROGRESS") {
    const pct = total > 0 ? Math.round((relevantSelections.length / total) * 100) : 0;
    return (
      <div className={card} style={style}>
        <h2 className="font-heading text-lg md:text-xl text-foreground">Your ballot</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {relevantSelections.length} of {total} contests decided.
        </p>
        <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <Link to="/app/my-ballot/walkthrough">
          <Button className="mt-4 bg-primary text-primary-foreground gap-1.5">
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  // COMPLETE
  return (
    <div className={card} style={style}>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h2 className="font-heading text-lg md:text-xl text-foreground">Your ballot is ready</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {decided} decided{undecided > 0 ? `, ${undecided} still open` : ""}.
          </p>
          <p className="text-xs text-primary mt-2">
            Print it or save it to your photos before Election Day.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Link to="/app/my-ballot/export">
              <Button size="sm" className="bg-primary text-primary-foreground">View / print</Button>
            </Link>
            <Link to="/app/my-ballot/walkthrough">
              <Button size="sm" variant="outline">Edit</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
