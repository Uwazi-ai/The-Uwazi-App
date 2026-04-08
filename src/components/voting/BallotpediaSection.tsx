import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Candidate = Tables<"ballotpedia_candidates">;
type Measure = Tables<"ballotpedia_ballot_measures">;

function partyBorderColor(party: string | null) {
  const p = (party || "").toLowerCase();
  if (p.includes("dem")) return "border-l-blue-500";
  if (p.includes("rep")) return "border-l-red-500";
  if (p.includes("green")) return "border-l-green-500";
  if (p.includes("libert")) return "border-l-yellow-500";
  return "border-l-border";
}

function partyBadgeClasses(party: string | null) {
  const p = (party || "").toLowerCase();
  if (p.includes("dem")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (p.includes("rep")) return "bg-red-500/20 text-red-400 border-red-500/30";
  if (p.includes("green")) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (p.includes("libert")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-muted text-muted-foreground border-border";
}

interface BallotpediaSectionProps {
  candidates: Candidate[];
  measures: Measure[];
}

export default function BallotpediaSection({ candidates, measures }: BallotpediaSectionProps) {
  const navigate = useNavigate();

  if (candidates.length === 0 && measures.length === 0) return null;

  // Group candidates by office
  const byOffice: Record<string, Candidate[]> = {};
  candidates.forEach((c) => {
    const key = c.office;
    if (!byOffice[key]) byOffice[key] = [];
    byOffice[key].push(c);
  });

  const handleResearch = (name: string, office: string) => {
    const prompt = `Research ${name}, who is running for ${office}. Give me a nonpartisan overview of their background and key positions.`;
    navigate(`/ask?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Candidates */}
      {Object.keys(byOffice).length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-2xl text-foreground">BALLOTPEDIA CANDIDATES</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(byOffice).map(([office, cands]) => (
              <div
                key={office}
                className="rounded-card p-5 space-y-3"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
              >
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  {cands[0]?.office_level?.toUpperCase() || "OFFICE"}: {office}
                </p>
                <div className="space-y-2">
                  {cands.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-xl p-3 border-l-4 ${partyBorderColor(c.party)} flex items-center justify-between`}
                      style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: c.party_color ? `${c.party_color}20` : "var(--muted)", color: c.party_color || "var(--muted-foreground)" }}
                        >
                          {c.name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.name}</p>
                          <div className="flex items-center gap-1.5">
                            {c.party && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${partyBadgeClasses(c.party)}`}>
                                {c.party}
                              </span>
                            )}
                            {c.incumbent && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                Incumbent
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.ballotpedia_url && (
                          <a href={c.ballotpedia_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                            Ballotpedia ↗
                          </a>
                        )}
                        <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => handleResearch(c.name, c.office)}>
                          Ask Uwazi →
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Ballot Measures */}
      {measures.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-6">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-2xl text-foreground">BALLOT MEASURES</h2>
          </div>
          <div className="space-y-3">
            {measures.map((m) => (
              <MeasureCard key={m.id} measure={m} />
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Data sourced from Ballotpedia. UWAZI does not endorse any candidate, party, or ballot measure.
      </p>
    </motion.div>
  );
}

function MeasureCard({ measure }: { measure: Measure }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const title = measure.title;
  const summary = measure.summary || "";

  const handleResearch = () => {
    const prompt = `Explain ballot measure "${title}" in plain language. What would a YES vote mean? What would a NO vote mean?`;
    navigate(`/ask?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="rounded-card p-5 space-y-2" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">📋 {measure.measure_number || "BALLOT MEASURE"}</p>
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
      <div className="flex gap-2">
        {measure.ballotpedia_url && (
          <a href={measure.ballotpedia_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="text-xs gap-1 border-border h-7">
              Full Text <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
        )}
        <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={handleResearch}>
          Ask Uwazi →
        </Button>
      </div>
    </div>
  );
}
