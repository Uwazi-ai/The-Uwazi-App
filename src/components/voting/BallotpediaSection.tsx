import { useState, useMemo } from "react";
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

function getPartyShortLabel(party: string | null): string {
  const p = (party || "").toLowerCase();
  if (p.includes("dem")) return "Dem";
  if (p.includes("rep")) return "Rep";
  if (p.includes("green")) return "Green";
  if (p.includes("libert")) return "Lib";
  if (p === "nonpartisan" || !party) return "TBD";
  return party || "TBD";
}

/** Returns true if the "name" field is actually a district name, not a real candidate */
function isPlaceholderName(name: string): boolean {
  return /congressional district/i.test(name) ||
    /incumbents are/i.test(name) ||
    /marked with/i.test(name) ||
    /bolded and underlined/i.test(name);
}

/** Extract district number from a district-name string like "Missouri's 3rd Congressional District" */
function extractDistrictNumber(name: string): number {
  const m = name.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

/** Determine if an office is a federal congressional race */
function isFederalHouse(office: string): boolean {
  return /u\.?s\.?\s*house/i.test(office);
}

interface BallotpediaSectionProps {
  candidates: Candidate[];
  measures: Measure[];
}

export default function BallotpediaSection({ candidates, measures }: BallotpediaSectionProps) {
  const navigate = useNavigate();

  if (candidates.length === 0 && measures.length === 0) return null;

  // Filter out instruction-text rows entirely
  const realCandidates = candidates.filter((c) => !/incumbents are/i.test(c.name));

  // Separate district-placeholder cards from real candidate cards
  const districtPlaceholders = realCandidates.filter((c) => isPlaceholderName(c.name));
  const namedCandidates = realCandidates.filter((c) => !isPlaceholderName(c.name));

  // Group named candidates by office
  const byOffice: Record<string, Candidate[]> = {};
  namedCandidates.forEach((c) => {
    const key = c.office;
    if (!byOffice[key]) byOffice[key] = [];
    byOffice[key].push(c);
  });

  // Group district placeholders by office, sorted by district number
  const districtsByOffice: Record<string, Candidate[]> = {};
  districtPlaceholders.forEach((c) => {
    const key = c.office;
    if (!districtsByOffice[key]) districtsByOffice[key] = [];
    districtsByOffice[key].push(c);
  });
  // Sort each group by district number
  Object.values(districtsByOffice).forEach((arr) =>
    arr.sort((a, b) => extractDistrictNumber(a.name) - extractDistrictNumber(b.name))
  );

  // Merge: for offices that only have placeholders, create entries
  const allOffices = new Set([...Object.keys(byOffice), ...Object.keys(districtsByOffice)]);

  const handleResearch = (name: string, office: string) => {
    const prompt = `Research ${name}, who is running for ${office}. Give me a nonpartisan overview of their background and key positions.`;
    navigate(`/ask?q=${encodeURIComponent(prompt)}`);
  };

  /** Clean office label: remove "— District X" suffix for section headers showing multiple districts */
  function cleanOfficeHeader(office: string, districtCards: Candidate[]): string {
    if (districtCards.length > 1 && /district\s+\d+/i.test(office)) {
      // Get state from first card
      const state = districtCards[0]?.state_code || "";
      const stateNames: Record<string, string> = { MO: "Missouri", CA: "California", TX: "Texas", NY: "New York", FL: "Florida", IL: "Illinois", OH: "Ohio", PA: "Pennsylvania", GA: "Georgia", MI: "Michigan" };
      const stateName = stateNames[state] || state;
      return `U.S. House — ${stateName}`;
    }
    return office;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Named candidates (real data) */}
      {Object.keys(byOffice).length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-2xl text-foreground">Your CANDIDATES</h2>
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
                      className={`rounded-xl p-3 border-l-4 ${partyBorderColor(c.party)} flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors`}
                      style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
                      onClick={() => navigate(`/vote/candidates/${c.id}`)}
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
                            <PartyBadge party={c.party} isFederal={isFederalHouse(c.office)} />
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
                          <a
                            href={c.ballotpedia_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ballotpedia ↗
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary h-7"
                          onClick={(e) => { e.stopPropagation(); handleResearch(c.name, c.office); }}
                        >
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

      {/* District placeholder cards (scraped data without real candidate names) */}
      {Object.keys(districtsByOffice).length > 0 && (
        <>
          {Object.keys(byOffice).length === 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-2xl text-foreground">Your CANDIDATES</h2>
            </div>
          )}
          <div className="space-y-3">
            {Object.entries(districtsByOffice).map(([office, cards]) => {
              const headerLabel = cleanOfficeHeader(office, cards);
              const level = cards[0]?.office_level?.toUpperCase() || "FEDERAL";
              return (
                <div
                  key={office}
                  className="rounded-card p-5 space-y-3"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
                >
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    {level}: {headerLabel}
                  </p>
                  <div className="space-y-2">
                    {cards.map((c) => {
                      // Extract district name as the race title
                      const districtName = c.name; // e.g. "Missouri's 3rd Congressional District"
                      return (
                        <div
                          key={c.id}
                          className="rounded-xl p-3 border-l-4 border-l-border flex items-center justify-between"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {extractDistrictNumber(districtName)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{districtName}</p>
                              <p className="text-[10px] text-muted-foreground">Candidates TBA</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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

/** Smart party badge: shows Dem/Rep for federal races, TBD if nonpartisan on a partisan race */
function PartyBadge({ party, isFederal }: { party: string | null; isFederal: boolean }) {
  const p = (party || "").toLowerCase();
  // If it says "nonpartisan" but it's a federal house race, show TBD instead
  const isNonpartisan = p === "nonpartisan" || !party;
  if (isNonpartisan && isFederal) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
        TBD
      </span>
    );
  }
  if (isNonpartisan) return null;

  const label = getPartyShortLabel(party);
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${partyBadgeClasses(party)}`}>
      {label}
    </span>
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
