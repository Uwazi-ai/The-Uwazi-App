import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ExternalLink, Trophy, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { differenceInDays, format } from "date-fns";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
type Race = {
  id: string;
  state: string;
  office: string;
  district: number | null;
  election_date: string;
  phase: string;
  is_partisan: boolean;
  ballotpedia_url: string | null;
  last_scraped_at: string | null;
};

type Candidate = {
  id: string;
  race_id: string;
  name: string;
  party: string;
  is_incumbent: boolean;
  status: string;
  photo_url: string | null;
  ballotpedia_url: string | null;
  vote_pct: number | null;
};

type RaceWithCandidates = Race & { candidates: Candidate[] };

/* ─── Helpers ─── */
const GENERAL_DATE = "2026-11-03";

const PARTY_COLORS: Record<string, string> = {
  democrat: "hsl(220, 70%, 50%)",
  republican: "hsl(0, 72%, 51%)",
  independent: "hsl(270, 50%, 55%)",
  nonpartisan: "hsl(0, 0%, 50%)",
};

const PARTY_LABEL: Record<string, string> = {
  democrat: "Democrat",
  republican: "Republican",
  independent: "Independent",
  nonpartisan: "Nonpartisan",
};

const OFFICE_LABELS: Record<string, string> = {
  us_house: "U.S. House",
  us_senate: "U.S. Senate",
  governor: "Governor",
  state_senate: "State Senate",
  state_house: "State House",
};

const OFFICE_GROUP: Record<string, "federal" | "state"> = {
  us_house: "federal",
  us_senate: "federal",
  governor: "state",
  state_senate: "state",
  state_house: "state",
};

function getCurrentPhase(race: Race): string {
  return race.phase || "primary";
}

function daysUntil(dateStr: string): number {
  return differenceInDays(new Date(dateStr + "T00:00:00"), new Date());
}

function sortRaces(races: RaceWithCandidates[]): RaceWithCandidates[] {
  return [...races].sort((a, b) => {
    const groupA = OFFICE_GROUP[a.office] === "federal" ? 0 : 1;
    const groupB = OFFICE_GROUP[b.office] === "federal" ? 0 : 1;
    if (groupA !== groupB) return groupA - groupB;
    const orderMap: Record<string, number> = { us_senate: 0, us_house: 1, governor: 2, state_senate: 3, state_house: 4 };
    const offA = orderMap[a.office] ?? 99;
    const offB = orderMap[b.office] ?? 99;
    if (offA !== offB) return offA - offB;
    return (a.district ?? 0) - (b.district ?? 0);
  });
}

/* ─── Candidate Card ─── */
function CandidateCard({ candidate, phase, isPartisan }: { candidate: Candidate; phase: string; isPartisan: boolean }) {
  const partyColor = PARTY_COLORS[candidate.party] || PARTY_COLORS.nonpartisan;
  const partyLabel = PARTY_LABEL[candidate.party] || candidate.party;
  const isWinner = candidate.status === "won_general";

  return (
    <Card className="bg-card border-border/40 hover:border-primary/30 transition-colors relative overflow-hidden">
      {isWinner && phase === "results" && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "hsl(var(--primary))" }} />
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Photo / Initials */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 relative"
            style={{ background: candidate.photo_url ? undefined : partyColor }}
          >
            {candidate.photo_url ? (
              <img
                src={candidate.photo_url}
                alt={candidate.name}
                className="w-12 h-12 rounded-xl object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.textContent =
                    candidate.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
                }}
              />
            ) : (
              candidate.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
            )}
            {/* Incumbent dot */}
            {candidate.is_incumbent && (phase === "general" || phase === "results") && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm truncate">{candidate.name}</span>
              {candidate.is_incumbent && (
                <span className="text-[10px] text-muted-foreground font-medium">(i)</span>
              )}
              {isWinner && phase === "results" && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0">
                  <Trophy className="w-2.5 h-2.5 mr-0.5" /> Winner
                </Badge>
              )}
            </div>

            {/* Party badge */}
            {isPartisan && (
              <Badge
                variant="outline"
                className="mt-1 text-[10px] px-1.5 py-0 border-current"
                style={{ color: partyColor, borderColor: partyColor + "60" }}
              >
                {partyLabel}
              </Badge>
            )}

            {/* Results: vote percentage bar */}
            {phase === "results" && candidate.vote_pct != null && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Vote share</span>
                  <span className="font-mono font-semibold text-foreground">{candidate.vote_pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${candidate.vote_pct}%`, background: partyColor }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ballotpedia link */}
          {candidate.ballotpedia_url && (
            <a
              href={candidate.ballotpedia_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors p-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Race Section ─── */
function RaceSection({ race }: { race: RaceWithCandidates }) {
  const phase = getCurrentPhase(race);
  const officeLabel = OFFICE_LABELS[race.office] || race.office;
  const districtLabel = race.district ? `District ${race.district}` : "";
  const title = districtLabel ? `${officeLabel} — ${districtLabel}` : officeLabel;

  const activeCandidates = useMemo(() => {
    if (phase === "primary") return race.candidates.filter((c) => c.status === "active");
    if (phase === "general") return race.candidates.filter((c) => c.status === "won_primary");
    return race.candidates; // results: show all
  }, [race.candidates, phase]);

  const daysLeft = phase === "results" ? 0 : daysUntil(phase === "general" ? GENERAL_DATE : race.election_date);

  // Group by party for primary
  const groupedByParty = useMemo(() => {
    if (phase !== "primary") return null;
    const groups: Record<string, Candidate[]> = {};
    activeCandidates.forEach((c) => {
      const key = c.party || "nonpartisan";
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [activeCandidates, phase]);

  return (
    <div className="space-y-3">
      {/* Race header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {activeCandidates.length} candidate{activeCandidates.length !== 1 ? "s" : ""}
              {phase === "primary" && " in primary"}
            </span>
            {phase !== "results" && daysLeft > 0 && (
              <span className="text-[11px] text-primary flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {daysLeft} days left
              </span>
            )}
            {phase === "results" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                Called
              </Badge>
            )}
          </div>
        </div>
        {race.ballotpedia_url && (
          <a
            href={race.ballotpedia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            Ballotpedia <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Candidates */}
      {phase === "primary" && groupedByParty ? (
        <div className="space-y-4">
          {Object.entries(groupedByParty)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([party, candidates]) => (
              <div key={party} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: PARTY_COLORS[party] || PARTY_COLORS.nonpartisan }} />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {PARTY_LABEL[party] || party}s
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {candidates.map((c) => (
                    <CandidateCard key={c.id} candidate={c} phase={phase} isPartisan={race.is_partisan} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {activeCandidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} phase={phase} isPartisan={race.is_partisan} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function CandidatesPage() {
  const { profile } = useProfile();
  const stateCode = profile?.state_code || "MO";

  const { data: races, isLoading } = useQuery({
    queryKey: ["election-races", stateCode],
    queryFn: async () => {
      const { data: racesData, error: racesErr } = await supabase
        .from("election_races")
        .select("*")
        .eq("state", stateCode)
        .order("election_date", { ascending: true });

      if (racesErr) throw racesErr;
      if (!racesData?.length) return [] as RaceWithCandidates[];

      const raceIds = racesData.map((r: any) => r.id);
      const { data: candidatesData, error: candErr } = await supabase
        .from("race_candidates")
        .select("*")
        .in("race_id", raceIds);

      if (candErr) throw candErr;

      const candMap = new Map<string, Candidate[]>();
      (candidatesData || []).forEach((c: any) => {
        const arr = candMap.get(c.race_id) || [];
        arr.push(c);
        candMap.set(c.race_id, arr);
      });

      return racesData.map((r: any) => ({ ...r, candidates: candMap.get(r.id) || [] })) as RaceWithCandidates[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const sorted = useMemo(() => sortRaces(races || []), [races]);

  const federalRaces = sorted.filter((r) => OFFICE_GROUP[r.office] === "federal");
  const stateRaces = sorted.filter((r) => OFFICE_GROUP[r.office] === "state");

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <Link to="/vote" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="w-4 h-4" /> Voting Hub
        </Link>
        <h1 className="text-xl font-bold text-foreground">2026 Candidates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{stateCode} — Midterm Elections</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="px-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border/40">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !sorted.length && (
        <div className="px-4 py-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No races found for {stateCode} yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Race data will appear once seeded.</p>
        </div>
      )}

      {/* Federal section */}
      {federalRaces.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Federal</h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-6">
            {federalRaces.map((race) => (
              <RaceSection key={race.id} race={race} />
            ))}
          </div>
        </div>
      )}

      {/* State section */}
      {stateRaces.length > 0 && (
        <div className="px-4">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">State</h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-6">
            {stateRaces.map((race) => (
              <RaceSection key={race.id} race={race} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
