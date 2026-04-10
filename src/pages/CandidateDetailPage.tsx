import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Globe, ExternalLink, Calendar, MapPin, Vote, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["candidate-detail", id],
    queryFn: async () => {
      const { data: cand, error } = await supabase
        .from("race_candidates")
        .select("*, election_races(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return cand as any;
    },
    enabled: !!id,
  });

  const candidate = data;
  const race = candidate?.election_races;

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-4 space-y-6">
        <Skeleton className="h-6 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-[72px] h-[72px] rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Candidate not found.</p>
      </div>
    );
  }

  const partyColor = PARTY_COLORS[candidate.party] || PARTY_COLORS.nonpartisan;
  const partyLabel = PARTY_LABEL[candidate.party] || candidate.party;
  const officeLabel = OFFICE_LABELS[race?.office] || race?.office || "";
  const districtLabel = race?.district ? `District ${race.district}` : "";
  const stateLabel = race?.state || "";
  const raceLabel = districtLabel
    ? `${officeLabel} · ${stateLabel}'s ${districtLabel}`
    : `${officeLabel} · ${stateLabel}`;

  const initials = candidate.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const districtShort = race?.district
    ? `${stateLabel}-${String(race.district).padStart(2, "0")}`
    : stateLabel;

  const electionFormatted = race?.election_date
    ? format(new Date(race.election_date + "T00:00:00"), "MMM d ''yy")
    : "—";

  const positions = candidate.positions as Array<{ topic: string; detail: string }> | null;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-6 space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
            style={{ background: candidate.photo_url ? undefined : partyColor }}
          >
            {candidate.photo_url ? (
              <img
                src={candidate.photo_url}
                alt={candidate.name}
                className="w-[72px] h-[72px] rounded-2xl object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.textContent = initials;
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <h1 className="text-[22px] font-bold text-foreground leading-tight">{candidate.name}</h1>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className="text-[11px] px-2 py-0.5 text-white border-0"
                style={{ background: partyColor }}
              >
                {partyLabel}
              </Badge>
              {candidate.is_incumbent && (
                <Badge className="text-[11px] px-2 py-0.5 bg-primary/20 text-primary border-primary/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block mr-1" />
                  Incumbent
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{raceLabel}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {candidate.website_url && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-border/60"
              onClick={() => window.open(candidate.website_url, "_blank")}
            >
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              {getDomain(candidate.website_url)}
            </Button>
          )}
          {candidate.ballotpedia_url && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-border/60"
              onClick={() => window.open(candidate.ballotpedia_url, "_blank")}
            >
              Ballotpedia profile
              <ExternalLink className="w-3 h-3 ml-1.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* About */}
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <h2 className="text-sm font-bold text-foreground mb-2 uppercase tracking-wider">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {candidate.bio || "Biography not yet available. Check back soon."}
            </p>
          </CardContent>
        </Card>

        {/* Key Positions */}
        {positions && positions.length > 0 && (
          <Card className="bg-card border-border/40">
            <CardContent className="p-4">
              <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Key Positions</h2>
              <div className="space-y-3">
                {positions.map((pos, i) => (
                  <div key={i}>
                    <span className="text-sm font-semibold text-foreground">{pos.topic}</span>
                    {pos.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{pos.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* District Snapshot */}
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">District Snapshot</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded-lg p-3 text-center">
                <MapPin className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">District</p>
                <p className="text-sm font-bold text-foreground">{districtShort}</p>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Last Election</p>
                <p className="text-sm font-bold text-foreground">
                  {candidate.last_election_pct != null ? `${candidate.last_election_pct}%` : "—"}
                </p>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <Vote className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Office Sought</p>
                <p className="text-sm font-bold text-foreground">{officeLabel}</p>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Election Date</p>
                <p className="text-sm font-bold text-foreground">{electionFormatted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uwazi Interview */}
        <Card className="bg-card border-border/40 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-lg">U</span>
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-bold text-foreground">AI-powered candidate interview</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Uwazi.ai asks every candidate the same questions — so you can compare answers side by side.
                </p>
                <Badge className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  Coming before Nov 2026
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 text-xs border-primary/30 text-primary hover:bg-primary/10"
              onClick={() =>
                navigate(
                  `/ask?q=${encodeURIComponent(
                    `Tell me about ${candidate.name} and their positions on ${officeLabel}`
                  )}`
                )
              }
            >
              Ask Uwazi about this candidate →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
