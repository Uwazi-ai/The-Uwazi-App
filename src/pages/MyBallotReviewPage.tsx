import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertCircle, Camera, Mail, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PracticeBanner } from "@/components/ballot/PracticeBanner";
import {
  useVoterProfile,
  useBallotContestsForState,
  useBallotCandidates,
  useMyBallotSelections,
  filterContestsForParty,
  isAddressComplete,
  ELECTION_LABEL,
  PARTY_LABEL,
  PartyKey,
  SUPPORTED_STATES,
} from "@/hooks/useMyBallot";

export default function MyBallotReviewPage() {
  const { data: profile, isLoading } = useVoterProfile();
  const state = profile?.state_code || null;
  const party = (profile?.party_preference as PartyKey) || null;
  const { data: allContests = [] } = useBallotContestsForState(state);
  const { data: selections = [] } = useMyBallotSelections();

  const contests = useMemo(() => filterContestsForParty(allContests, party), [allContests, party]);
  const contestIds = useMemo(() => contests.map((c) => c.id), [contests]);
  const { data: candidates = [] } = useBallotCandidates(contestIds);

  if (isLoading) return <div className="max-w-2xl mx-auto px-4 py-10"><div className="animate-pulse rounded-2xl h-40 bg-white/5" /></div>;
  if (!profile || !isAddressComplete(profile) || !state || !SUPPORTED_STATES.includes(state) || !party) {
    return <Navigate to="/app/my-ballot" replace />;
  }

  const rows = contests.map((c) => {
    const sel = selections.find((s) => s.contest_id === c.id);
    let choice = "Still deciding";
    let undecided = true;
    if (c.contest_type === "candidate_race") {
      if (sel?.candidate_id) {
        const cand = candidates.find((cc) => cc.id === sel.candidate_id);
        choice = cand ? `${cand.name}${cand.party ? ` (${cand.party})` : ""}` : "Selected";
        undecided = false;
      }
    } else if (sel?.measure_vote === "yes") { choice = "Yes"; undecided = false; }
    else if (sel?.measure_vote === "no") { choice = "No"; undecided = false; }
    return { contest: c, choice, undecided };
  });

  const undecidedCount = rows.filter((r) => r.undecided).length;

  const openMailto = () => {
    const lines = rows.map((r) => `${r.contest.measure_title}\n  ${r.choice}`).join("\n\n");
    const body = `My Ballot Notes — ${ELECTION_LABEL}\n${PARTY_LABEL[party]} ballot · ${profile.city || ""}, ${state}\n\n${lines}\n\n(Practice ballot — not an official ballot. Personal notes only.)`;
    const url = `mailto:?subject=${encodeURIComponent("My Ballot Notes — " + ELECTION_LABEL)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-10 space-y-5">
      <Helmet><title>Review My Ballot — UWAZI</title></Helmet>

      <PracticeBanner />

      <header>
        <h1 className="font-heading text-3xl md:text-4xl text-foreground" style={{ letterSpacing: "-0.02em" }}>
          Your ballot is ready
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {profile.city ? `${profile.city}, ` : ""}{profile.county_name ? `${profile.county_name} · ` : ""}
          {PARTY_LABEL[party]} ballot · {ELECTION_LABEL}
        </p>
      </header>

      <div
        className="rounded-2xl divide-y divide-white/5 overflow-hidden"
        style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {rows.map((r) => (
          <div key={r.contest.id} className="p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {r.contest.contest_type === "ballot_measure" ? "Measure" : "Race"}
            </div>
            <div className="font-medium text-foreground mt-0.5">{r.contest.measure_title}</div>
            <div className={"mt-1 text-sm " + (r.undecided ? "text-amber-300/90" : "text-primary")}>
              {r.undecided && <AlertCircle className="inline h-3.5 w-3.5 mr-1" />}
              {r.choice}
            </div>
          </div>
        ))}
      </div>

      {undecidedCount > 0 && (
        <p className="text-sm text-muted-foreground">
          You can leave these blank at the polls, or come back and decide later. Skipping a race doesn't invalidate the
          rest of your ballot.
        </p>
      )}

      <p className="text-sm text-foreground">
        Some polling places limit phone use, so we recommend printing this or saving it to your photos before you go.
      </p>

      <div className="grid grid-cols-1 gap-2">
        <Link to="/app/my-ballot/export">
          <Button className="w-full bg-primary text-primary-foreground gap-2">
            <Printer className="h-4 w-4" /> Print my ballot
          </Button>
        </Link>
        <Link to="/app/my-ballot/export?action=save">
          <Button variant="outline" className="w-full gap-2">
            <Camera className="h-4 w-4" /> Save to my photos
          </Button>
        </Link>
        <Button variant="outline" className="w-full gap-2" onClick={openMailto}>
          <Mail className="h-4 w-4" /> Email it to myself
        </Button>
      </div>

      <div className="text-center">
        <Link to="/app/my-ballot/walkthrough" className="text-sm text-primary hover:underline">
          Edit my choices
        </Link>
      </div>
    </div>
  );
}
