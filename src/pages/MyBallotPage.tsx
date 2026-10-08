import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Check, ExternalLink, HelpCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ballotLevel, matchContest } from "@/lib/districts";
import {
  useVoterProfile,
  useElectionAuthority,
  useMyFullBallot,
  useBallotCandidates,
  useMyBallotSelections,
  useSaveSelection,
  isAddressComplete,
  lookupPrecinct,
  SUPPORTED_STATES,
  ELECTION_LABEL,
  BallotCandidate,
  BallotContest,
  BallotSelection,
} from "@/hooks/useMyBallot";

const SECTIONS: { key: ReturnType<typeof ballotLevel>; label: string }[] = [
  { key: "federal", label: "Federal" },
  { key: "state", label: "State" },
  { key: "county", label: "County" },
  { key: "local", label: "City and local" },
  { key: "measure", label: "Ballot measures" },
];

const card = "rounded-2xl border border-border bg-card p-5 md:p-6";

export default function MyBallotPage() {
  const { data: profile, isLoading: pLoading } = useVoterProfile();
  const state = profile?.state_code || null;
  const { data: all = [], districts, isLoading } = useMyFullBallot(state);
  const { data: authority } = useElectionAuthority(profile);
  const { data: selections = [] } = useMyBallotSelections();

  const { mine, unknown } = useMemo(() => {
    const mine: BallotContest[] = [];
    let unknown = 0;
    for (const c of all) {
      const m = matchContest(c, districts?.resolved);
      if (m === "match") mine.push(c);
      else if (m === "unknown") unknown++;
    }
    return { mine, unknown };
  }, [all, districts]);

  const ids = useMemo(() => mine.map((c) => c.id), [mine]);
  const { data: candidates = [] } = useBallotCandidates(ids);

  if (pLoading || (isAddressComplete(profile) && isLoading)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-3">
        <div className="animate-pulse rounded-2xl h-28 bg-muted" />
        <div className="animate-pulse rounded-2xl h-48 bg-muted" />
      </div>
    );
  }

  const authorityLink = authority?.lookup_url || authority?.website || null;
  const authorityName = authority?.display_name || "your local election office";
  const picked = mine.filter((c) => selections.some((s) => s.contest_id === c.id && (s.candidate_id || s.measure_vote))).length;
  const kcNoPrecinct = state === "MO" && (profile?.city || "").toLowerCase().includes("kansas city") && !lookupPrecinct(profile?.precinct_id) && !districts?.resolved?.state_house;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-10 space-y-5 overflow-x-hidden">
      <Helmet>
        <title>My Ballot | UWAZI</title>
        <meta name="description" content="See every race, candidate and measure on your November 3 ballot." />
      </Helmet>

      <header>
        <p className="text-xs tracking-widest uppercase text-muted-foreground">My Ballot</p>
        <h1 className="font-heading text-3xl md:text-4xl mt-1 text-foreground">Your November ballot</h1>
        <p className="text-sm text-muted-foreground mt-2">{ELECTION_LABEL}. Tap a choice to save it. Your picks stay private.</p>
      </header>

      {!isAddressComplete(profile) ? (
        <div className={card}>
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-1" />
            <div>
              <h2 className="font-heading text-lg text-foreground">Add your address first</h2>
              <p className="text-sm text-muted-foreground mt-2">ZIP codes cross district lines. Your full address lets us find the right races. We keep only your district codes.</p>
              <Link to="/app/settings"><Button className="mt-4">Add my address</Button></Link>
            </div>
          </div>
        </div>
      ) : !SUPPORTED_STATES.includes(state || "") ? (
        <div className={card}>
          <h2 className="font-heading text-lg text-foreground">We do not have ballots for your state yet</h2>
          <p className="text-sm text-muted-foreground mt-2">We cover Missouri and Kansas for now. Your state election office has your sample ballot.</p>
          <a href="https://www.vote.org/polling-place-locator/" target="_blank" rel="noreferrer"><Button className="mt-4">Find my election office</Button></a>
        </div>
      ) : (
        <>
          <div className={cn(card, "flex items-center justify-between gap-4")}>
            <div>
              <p className="font-heading text-3xl text-foreground">{picked}<span className="text-muted-foreground text-lg"> of {mine.length}</span></p>
              <p className="text-xs text-muted-foreground mt-1">choices saved</p>
            </div>
            <Link to="/app/my-ballot/export"><Button disabled={mine.length === 0}>Print or save <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
          </div>

          {kcNoPrecinct && (
            <Link to="/app/my-ballot/setup" className="block rounded-xl p-4 border border-primary/30 bg-primary/10 text-sm text-foreground">
              Add your ward and precinct to see your State House and County Legislature races. <span className="text-primary">Add it now</span>
            </Link>
          )}

          {mine.length === 0 ? (
            <div className={card}>
              <h2 className="font-heading text-lg text-foreground">Your ballot is not ready yet</h2>
              <p className="text-sm text-muted-foreground mt-2">We have not verified the races for your area. We only show what we have checked. {authorityName} has the official sample ballot.</p>
              {authorityLink && <a href={authorityLink} target="_blank" rel="noreferrer"><Button className="mt-4">See my sample ballot <ExternalLink className="h-4 w-4 ml-1" /></Button></a>}
            </div>
          ) : (
            SECTIONS.map((s) => {
              const list = mine.filter((c) => ballotLevel(c as any) === s.key);
              if (!list.length) return null;
              return (
                <section key={s.key} className="space-y-3">
                  <h2 className="text-xs tracking-widest uppercase text-muted-foreground pt-2">{s.label}</h2>
                  {list.map((c) => (
                    <ContestCard key={c.id} contest={c} candidates={candidates.filter((x) => x.contest_id === c.id)} selection={selections.find((x) => x.contest_id === c.id)} />
                  ))}
                </section>
              );
            })
          )}

          {unknown > 0 && (
            <p className="text-xs text-muted-foreground">
              {unknown} more {unknown === 1 ? "race is" : "races are"} hidden because we could not confirm that district for you. Check your sample ballot{authorityLink ? <> at <a href={authorityLink} target="_blank" rel="noreferrer" className="text-primary underline">{authorityName}</a></> : null}.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            UWAZI provides factual candidate info from official sources. We do not endorse any candidate, party or position. Always check your official sample ballot.
          </p>

          {mine.length > 0 && (
            <Link to="/app/my-ballot/export" className="block"><Button className="w-full">Review and print my ballot <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
          )}
        </>
      )}
    </div>
  );
}

function ContestCard({ contest, candidates, selection }: { contest: BallotContest & { office_name?: string | null; vote_for?: number }; candidates: BallotCandidate[]; selection?: BallotSelection }) {
  const save = useSaveSelection();
  const [open, setOpen] = useState(false);
  const isMeasure = contest.contest_type === "ballot_measure";

  const pick = async (args: { candidate_id?: string | null; measure_vote?: "yes" | "no" | "undecided" | null }) => {
    try {
      await save.mutateAsync({ contest_id: contest.id, candidate_id: args.candidate_id ?? null, measure_vote: args.measure_vote ?? null, party_snapshot: null });
    } catch {
      toast.error("Could not save that. Try again.");
    }
  };

  const undecided = selection?.measure_vote === "undecided";

  return (
    <article className={card}>
      <h3 className="font-heading text-xl text-foreground">{contest.measure_title}</h3>
      {!isMeasure && (contest.vote_for ?? 1) > 1 && <p className="text-xs text-muted-foreground mt-1">Vote for up to {contest.vote_for}</p>}
      {contest.plain_summary && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{contest.plain_summary}</p>}

      <div className="mt-4 space-y-2">
        {isMeasure ? (
          <div className="grid grid-cols-2 gap-2">
            {(["yes", "no"] as const).map((v) => (
              <Choice key={v} active={selection?.measure_vote === v} onClick={() => pick({ measure_vote: v })} title={v === "yes" ? "Yes" : "No"} hint={v === "yes" ? contest.yes_means : contest.no_means} />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">The candidate list is not final yet. Check back soon.</p>
        ) : (
          candidates.map((c) => (
            <Choice
              key={c.id}
              active={selection?.candidate_id === c.id}
              onClick={() => pick({ candidate_id: c.id })}
              title={c.name}
              hint={[c.party, c.is_incumbent ? "Incumbent" : null].filter(Boolean).join(" · ") || null}
            />
          ))
        )}
        {(isMeasure || candidates.length > 0) && (
          <button onClick={() => pick({ measure_vote: "undecided" })} className={cn("w-full text-left rounded-xl p-3 border transition-colors flex items-center gap-2 text-sm", undecided ? "border-primary" : "border-border hover:border-foreground/30")}>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">Still deciding</span>
            {undecided && <Check className="ml-auto h-4 w-4 text-primary" />}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {isMeasure && contest.measure_summary && (
          <button onClick={() => setOpen((o) => !o)} className="text-primary hover:underline">{open ? "Hide" : "Read"} the official wording</button>
        )}
        {contest.source_url && (
          <a href={contest.source_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Source{contest.source_name ? `: ${contest.source_name}` : ""} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {open && contest.measure_summary && (
        <div className="mt-2 rounded-lg p-3 text-sm text-muted-foreground border border-border whitespace-pre-wrap">{contest.measure_summary}</div>
      )}
    </article>
  );
}

function Choice({ active, onClick, title, hint }: { active: boolean; onClick: () => void; title: string; hint: string | null }) {
  return (
    <button onClick={onClick} className={cn("w-full text-left rounded-xl p-3 border transition-colors", active ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-foreground">{title}</div>
          {hint && <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{hint}</div>}
        </div>
        {active && <Check className="h-4 w-4 text-primary shrink-0" />}
      </div>
    </button>
  );
}
