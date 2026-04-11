import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink, Users, FileText, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { RaceWithCandidates } from "@/hooks/useBallotpediaData";
import type { Tables } from "@/integrations/supabase/types";

type Measure = Tables<"ballotpedia_ballot_measures">;

const STATE_NAMES: Record<string, string> = {
  MO: "Missouri", CA: "California", TX: "Texas", NY: "New York", FL: "Florida",
  IL: "Illinois", OH: "Ohio", PA: "Pennsylvania", GA: "Georgia", MI: "Michigan",
  KS: "Kansas", IA: "Iowa", NE: "Nebraska", AR: "Arkansas", OK: "Oklahoma",
};

function officeLabel(office: string): string {
  switch (office) {
    case "us_senate": return "U.S. Senate";
    case "us_house": return "U.S. House";
    case "governor": return "Governor";
    default: return office.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function isFederal(office: string): boolean {
  return office.startsWith("us_");
}

function partyColor(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("dem")) return "#3b82f6";
  if (p.includes("rep")) return "#ef4444";
  if (p.includes("green")) return "#22c55e";
  if (p.includes("libert")) return "#eab308";
  return "#6b7280";
}

function partyBadgeClasses(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("dem")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (p.includes("rep")) return "bg-red-500/20 text-red-400 border-red-500/30";
  if (p.includes("green")) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (p.includes("libert")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function partyShortLabel(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("dem")) return "Dem";
  if (p.includes("rep")) return "Rep";
  if (p.includes("green")) return "Green";
  if (p.includes("libert")) return "Lib";
  return "TBD";
}

function partyBorderClass(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("dem")) return "border-l-blue-500";
  if (p.includes("rep")) return "border-l-red-500";
  return "border-l-border";
}

interface BallotpediaSectionProps {
  racesWithCandidates: RaceWithCandidates[];
  measures: Measure[];
}

export default function BallotpediaSection({ racesWithCandidates, measures }: BallotpediaSectionProps) {
  const navigate = useNavigate();

  if (racesWithCandidates.length === 0 && measures.length === 0) return null;

  // Separate federal vs state races
  const federalRaces = racesWithCandidates.filter((r) => isFederal(r.office));
  const stateRaces = racesWithCandidates.filter((r) => !isFederal(r.office));

  // Group federal races by office type
  const federalByOffice: Record<string, RaceWithCandidates[]> = {};
  federalRaces.forEach((r) => {
    const key = r.office;
    if (!federalByOffice[key]) federalByOffice[key] = [];
    federalByOffice[key].push(r);
  });

  // Group state races by office type
  const stateByOffice: Record<string, RaceWithCandidates[]> = {};
  stateRaces.forEach((r) => {
    const key = r.office;
    if (!stateByOffice[key]) stateByOffice[key] = [];
    stateByOffice[key].push(r);
  });

  const stateName = racesWithCandidates[0] ? (STATE_NAMES[racesWithCandidates[0].state] || racesWithCandidates[0].state) : "";

  const handleResearch = (name: string, office: string) => {
    const prompt = `Research ${name}, who is running for ${office}. Give me a nonpartisan overview of their background and key positions.`;
    navigate(`/ask?q=${encodeURIComponent(prompt)}`);
  };

  // Filter out measures with garbage text
  const cleanMeasures = measures.filter((m) => {
    const title = (m.title || "").toLowerCase();
    return !title.includes("see also:") && !title.includes("ballot initiatives filed") && title.length > 5;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* FEDERAL SECTION */}
      {federalRaces.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-2xl text-foreground">Your CANDIDATES</h2>
          </div>

          {Object.entries(federalByOffice).map(([office, races]) => {
            // Sort by district
            const sorted = [...races].sort((a, b) => (a.district ?? 0) - (b.district ?? 0));
            const label = office === "us_house"
              ? `U.S. House — ${stateName}`
              : officeLabel(office);

            return (
              <div
                key={office}
                className="rounded-card p-5 space-y-3"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
              >
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  FEDERAL: {label}
                </p>
                <div className="space-y-2">
                  {sorted.map((race) => (
                    <RaceCard key={race.race_id} race={race} stateName={stateName} onResearch={handleResearch} navigate={navigate} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* STATE SECTION */}
      {stateRaces.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-6">
            <Landmark className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-xl text-foreground">STATE — {stateName.toUpperCase()}</h2>
          </div>

          {Object.entries(stateByOffice).map(([office, races]) => {
            const sorted = [...races].sort((a, b) => (a.district ?? 0) - (b.district ?? 0));
            return (
              <div
                key={office}
                className="rounded-card p-5 space-y-3"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
              >
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  STATE: {officeLabel(office)}
                </p>
                <div className="space-y-2">
                  {sorted.map((race) => (
                    <RaceCard key={race.race_id} race={race} stateName={stateName} onResearch={handleResearch} navigate={navigate} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* BALLOT MEASURES */}
      {cleanMeasures.length > 0 ? (
        <>
          <div className="flex items-center gap-2 mt-6">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-2xl text-foreground">BALLOT MEASURES</h2>
          </div>
          <div className="space-y-3">
            {cleanMeasures.map((m) => (
              <MeasureCard key={m.id} measure={m} />
            ))}
          </div>
        </>
      ) : measures.length === 0 && racesWithCandidates.length > 0 ? (
        <>
          <div className="flex items-center gap-2 mt-6">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-2xl text-foreground">BALLOT MEASURES</h2>
          </div>
          <div
            className="rounded-card p-5 text-center"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="text-sm text-muted-foreground">
              {stateName} ballot measures will appear here closer to the August primary.
            </p>
          </div>
        </>
      ) : null}

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Data sourced from Ballotpedia. UWAZI does not endorse any candidate, party, or ballot measure.
      </p>
    </motion.div>
  );
}

/* ─── Race Card ─── */
function RaceCard({
  race,
  stateName,
  onResearch,
  navigate,
}: {
  race: RaceWithCandidates;
  stateName: string;
  onResearch: (name: string, office: string) => void;
  navigate: (path: string) => void;
}) {
  const districtLabel = race.office === "us_house" && race.district
    ? `${stateName}'s ${race.district}${ordinalSuffix(race.district)} Congressional District`
    : officeLabel(race.office);

  if (race.candidates.length === 0) {
    return (
      <div
        className="rounded-xl p-3 border-l-4 border-l-border flex items-center justify-between"
        style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
            {race.district ?? "—"}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{districtLabel}</p>
            <p className="text-[10px] text-muted-foreground">Candidates TBA</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {race.office === "us_house" && race.district && (
        <p className="text-[11px] font-medium text-muted-foreground ml-1">
          District {race.district}
        </p>
      )}
      {race.candidates.map((c) => (
        <div
          key={c.id}
          className={`rounded-xl p-3 border-l-4 ${partyBorderClass(c.party)} flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors`}
          style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}
          onClick={() => navigate(`/vote/candidates/${c.id}`)}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: partyColor(c.party) }}
            >
              {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${partyBadgeClasses(c.party)}`}>
                  {partyShortLabel(c.party)}
                </span>
                {c.is_incumbent && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
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
              onClick={(e) => { e.stopPropagation(); onResearch(c.name, officeLabel(race.office)); }}
            >
              Ask Uwazi →
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/* ─── Measure Card ─── */
function MeasureCard({ measure }: { measure: Measure }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const title = measure.title;
  const summary = measure.summary || "";

  // Filter out raw article bleed-through
  const cleanSummary = summary
    .replace(/See also:.*$/gis, "")
    .replace(/\[edit\]/gi, "")
    .trim();

  const handleResearch = () => {
    const prompt = `Explain ballot measure "${title}" in plain language. What would a YES vote mean? What would a NO vote mean?`;
    navigate(`/ask?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="rounded-card p-5 space-y-2" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">📋 {measure.measure_number || "BALLOT MEASURE"}</p>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {cleanSummary && (
        <>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {expanded ? cleanSummary : cleanSummary.slice(0, 150) + (cleanSummary.length > 150 ? "..." : "")}
          </p>
          {cleanSummary.length > 150 && (
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
