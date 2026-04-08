import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function partyColor(party: string) {
  const p = (party || "").toLowerCase();
  if (p.includes("dem")) return "border-l-blue-500";
  if (p.includes("rep")) return "border-l-red-500";
  if (p.includes("green")) return "border-l-green-500";
  if (p.includes("libert")) return "border-l-yellow-500";
  return "border-l-border";
}

function partyBadge(party: string) {
  const p = (party || "").toLowerCase();
  if (p.includes("dem")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (p.includes("rep")) return "bg-red-500/20 text-red-400 border-red-500/30";
  if (p.includes("green")) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (p.includes("libert")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-muted text-muted-foreground border-border";
}

interface BallotSectionProps {
  contests: any[];
  isDemo: boolean;
  electionDate?: string;
}

export default function BallotSection({ contests, isDemo, electionDate }: BallotSectionProps) {
  const navigate = useNavigate();
  const races = contests.filter((c) => c.type !== "Referendum");
  const measures = contests.filter((c) => c.type === "Referendum");

  if (contests.length === 0 && !isDemo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-card p-6 text-center space-y-3"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
      >
        <h3 className="font-heading text-xl text-foreground">YOUR BALLOT</h3>
        <p className="text-sm text-muted-foreground">
          Your specific ballot isn't available yet. Ballot information is typically published 4-6 weeks before an election.
          {electionDate && ` Check back closer to ${new Date(electionDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a href="https://vote.gov" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-1.5 border-border">vote.gov <ExternalLink className="h-3.5 w-3.5" /></Button>
          </a>
          <a href="https://ballotpedia.org" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-1.5 border-border">Ballotpedia <ExternalLink className="h-3.5 w-3.5" /></Button>
          </a>
        </div>
      </motion.div>
    );
  }

  const handleResearch = (officeName: string, candidates: any[]) => {
    const names = candidates.map((c: any) => c.name).join(" and ");
    const prompt = `Research the candidates for ${officeName} in my area. Give me a nonpartisan comparison of ${names}.`;
    navigate(`/ask?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h2 className="font-heading text-2xl text-foreground">YOUR BALLOT</h2>

      {/* Races */}
      {races.length > 0 && (
        <div className="space-y-3">
          {races.map((contest: any, ci: number) => (
            <div
              key={ci}
              className="rounded-card p-5 space-y-3"
              style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
            >
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  OFFICE: {contest.office}
                </p>
                {contest.district?.name && (
                  <p className="text-xs text-muted-foreground">{contest.district.name}</p>
                )}
              </div>

              <div className="space-y-2">
                {(contest.candidates || []).map((c: any) => (
                  <div
                    key={c.name}
                    className={`rounded-xl p-3 border-l-4 ${partyColor(c.party)} flex items-center justify-between`}
                    style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {c.name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        {c.party && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${partyBadge(c.party)}`}>
                            {c.party}
                          </span>
                        )}
                      </div>
                    </div>
                    {c.candidateUrl && (
                      <a href={c.candidateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        Learn More ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {contest.candidates?.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary"
                  onClick={() => handleResearch(contest.office, contest.candidates)}
                >
                  Research with Ask Uwazi →
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Measures */}
      {measures.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-lg text-foreground">BALLOT MEASURES</h3>
          {measures.map((m: any, mi: number) => (
            <MeasureCard key={mi} measure={m} onResearch={() => handleResearch(m.referendumTitle || m.office, [])} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        UWAZI provides factual ballot information from official government sources. We do not endorse any candidate, party, or ballot measure. Always verify with your local election authority.
      </p>
    </motion.div>
  );
}

function MeasureCard({ measure, onResearch }: { measure: any; onResearch: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const title = measure.referendumTitle || measure.office || "Ballot Measure";
  const summary = measure.referendumSubtitle || measure.referendumBrief || "";

  return (
    <div
      className="rounded-card p-5 space-y-2"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
    >
      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">📋 BALLOT MEASURE</p>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {summary && (
        <>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {expanded ? summary : summary.slice(0, 150) + (summary.length > 150 ? "..." : "")}
          </p>
          {summary.length > 150 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary flex items-center gap-1">
              {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
            </button>
          )}
        </>
      )}
      <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={onResearch}>
        Research with Ask Uwazi →
      </Button>
    </div>
  );
}
