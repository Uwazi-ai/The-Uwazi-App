import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, ChevronDown, ChevronRight, ExternalLink, Check,
  MessageCircle, AlertCircle, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import AddressModal from "@/components/voting/AddressModal";
import RegistrationModal from "@/components/voting/RegistrationModal";
import {
  fetchVoterElections,
  getVoterElectionsFromProfile,
  type VoterElection,
  type VoterContest,
  type BallotMeasure,
  type VoterElectionsData,
} from "@/services/voterElections";

/* ─── helpers ─── */

function formatElectionDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(d);
}

function formatShortDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / 86400000);
}

function isToday(dateStr: string): boolean {
  return daysUntil(dateStr) === 0;
}

function isPast(dateStr: string): boolean {
  return daysUntil(dateStr) < 0;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

const stagger = (i: number) => ({ ...fadeUp, transition: { ...fadeUp.transition, delay: i * 0.1 } });

/* ─── party colors ─── */
function partyBorderColor(party?: string) {
  const p = (party || "").toLowerCase();
  if (p.includes("democrat")) return "border-[#3b82f6]/40";
  if (p.includes("republican")) return "border-[#ef4444]/40";
  return "border-[#555555]/40";
}

function partyPillClass(party?: string) {
  const p = (party || "").toLowerCase();
  if (p.includes("democrat")) return "bg-[#3b82f6]/15 text-[#60a5fa] border-[#3b82f6]/30";
  if (p.includes("republican")) return "bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30";
  return "bg-[#555555]/15 text-[#888888] border-[#555555]/30";
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

export default function VotingHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regModalUrl, setRegModalUrl] = useState("");
  const [regModalState, setRegModalState] = useState("");

  // Fetch voter profile
  const { data: voterProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["voter-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase.from("profiles") as any)
        .select("voter_address_street, voter_address_city, voter_address_state, voter_address_zip, voter_elections_data, voter_elections_cached_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: electionsResult, hasAddress, isFresh } = useMemo(() => {
    if (!voterProfile) return { data: null, hasAddress: false, isFresh: false };
    return getVoterElectionsFromProfile(voterProfile);
  }, [voterProfile]);

  // Background refresh if stale
  const { isLoading: refreshing } = useQuery({
    queryKey: ["voter-elections-refresh", user?.id],
    queryFn: async () => {
      if (!voterProfile) return null;
      const result = await fetchVoterElections({
        street: voterProfile.voter_address_street,
        city: voterProfile.voter_address_city,
        state: voterProfile.voter_address_state,
        zip: voterProfile.voter_address_zip,
      });
      queryClient.invalidateQueries({ queryKey: ["voter-profile"] });
      return result;
    },
    enabled: !!user && hasAddress && !isFresh && !profileLoading,
    staleTime: Infinity,
    retry: false,
  });

  const elections = electionsResult?.elections || [];
  const showSkeleton = profileLoading || (hasAddress && !electionsResult && refreshing);
  const initialAddress = voterProfile ? {
    street: voterProfile.voter_address_street || "",
    city: voterProfile.voter_address_city || "",
    state: voterProfile.voter_address_state || "",
    zip: voterProfile.voter_address_zip || "",
  } : undefined;

  const openRegModal = (url: string, stateLabel?: string) => {
    setRegModalUrl(url);
    setRegModalState(stateLabel || "");
    setRegModalOpen(true);
  };

  if (profileLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6">
      {!hasAddress ? (
        <AddressPrompt onAddAddress={() => setAddressModalOpen(true)} />
      ) : (
        <>
          {/* Page header */}
          <motion.div {...fadeUp} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">YOUR VOTER PROFILE</p>
              <p className="text-sm text-[#888888] mt-0.5">
                {voterProfile?.voter_address_street}, {voterProfile?.voter_address_city}, {voterProfile?.voter_address_state} {voterProfile?.voter_address_zip}
              </p>
            </div>
            <button onClick={() => setAddressModalOpen(true)} className="text-xs text-muted-foreground underline hover:text-foreground shrink-0">
              Update Address
            </button>
          </motion.div>

          {/* Stat cards */}
          <motion.div {...stagger(1)} className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-5" style={{ background: "#111111", border: "1px solid #2a2a2a" }}>
              <p className="text-3xl font-extrabold text-primary font-heading leading-none">
                {elections.length}
              </p>
              <p className="text-xs text-[#888888] mt-1">elections near you</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "#111111", border: "1px solid #2a2a2a" }}>
              <p className="text-3xl font-extrabold text-[#3b82f6] font-heading leading-none">
                {elections.reduce((sum, e) => sum + (e.contests?.length || 0), 0)}
              </p>
              <p className="text-xs text-[#888888] mt-1">races on your ballot</p>
            </div>
          </motion.div>

          {/* Election cards or skeleton */}
          {showSkeleton ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl p-5 space-y-4" style={{ background: "#111111", border: "1px solid #2a2a2a" }}>
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                  </div>
                  <Skeleton className="h-32 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {elections
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((election, idx) => (
                  <ElectionCard
                    key={election.id}
                    election={election}
                    index={idx}
                    onCheckReg={(url) => openRegModal(url, voterProfile?.voter_address_state)}
                    onRegister={(url) => openRegModal(url, voterProfile?.voter_address_state)}
                  />
                ))}
            </div>
          )}

          {/* Ask Uwazi nudge */}
          <motion.div {...stagger(elections.length + 2)} className="rounded-2xl p-5 flex items-start gap-3" style={{ background: "#111111", border: "1px solid #2a2a2a", borderLeft: "3px solid hsl(var(--primary))" }}>
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-sm text-[#888888]">Have a question about something on your ballot?</p>
              <Link to="/app/ask" className="text-sm text-primary hover:underline font-semibold mt-1 inline-block">
                Ask Uwazi →
              </Link>
            </div>
          </motion.div>
        </>
      )}

      <AddressModal open={addressModalOpen} onOpenChange={setAddressModalOpen} initialAddress={initialAddress} />
      <RegistrationModal open={regModalOpen} onOpenChange={setRegModalOpen} url={regModalUrl} stateLabel={regModalState} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ADDRESS PROMPT (State A)
   ═══════════════════════════════════════════════ */

function AddressPrompt({ onAddAddress }: { onAddAddress: () => void }) {
  return (
    <motion.div {...fadeUp} className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full rounded-2xl p-6 space-y-5" style={{ background: "#111111", border: "1px solid #2a2a2a", borderLeft: "3px solid hsl(var(--primary))" }}>
        <span className="text-3xl">📍</span>
        <h2 className="font-heading text-2xl font-extrabold text-foreground">Personalize your Voting Hub</h2>
        <p className="text-sm text-[#888888] leading-relaxed">
          Add your voting address to see your upcoming elections, registration deadlines, candidates, and polling location — all in one place.
        </p>
        <Button onClick={onAddAddress} className="w-full rounded-full h-12 text-sm font-bold bg-primary text-primary-foreground">
          Add My Address →
        </Button>
        <div className="flex flex-wrap gap-2 pt-2">
          {["🗳️ Upcoming elections", "📋 Your ballot", "📍 Polling location"].map((chip) => (
            <span key={chip} className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a2a] text-[#888888]" style={{ background: "#1a1a1a" }}>
              {chip}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   ELECTION CARD
   ═══════════════════════════════════════════════ */

function ElectionCard({
  election,
  index,
  onCheckReg,
  onRegister,
}: {
  election: VoterElection;
  index: number;
  onCheckReg: (url: string) => void;
  onRegister: (url: string) => void;
}) {
  const contests = election.contests || [];
  const measures = election.ballotMeasures || [];
  const deadlines = election.registrationDeadlines;
  const methods = election.votingMethods;
  const polling = election.pollingLocation;
  const [showAllContests, setShowAllContests] = useState(false);
  const visibleContests = showAllContests ? contests : contests.slice(0, 5);
  const hiddenCount = contests.length - 5;

  // Group contests by level
  const groupedContests = useMemo(() => {
    const groups: Record<string, VoterContest[]> = { federal: [], state: [], local: [] };
    visibleContests.forEach((c) => {
      const level = c.level || "local";
      if (!groups[level]) groups[level] = [];
      groups[level].push(c);
    });
    return groups;
  }, [visibleContests]);

  return (
    <motion.div {...stagger(index)} className="rounded-2xl p-5 space-y-5" style={{ background: "#111111", border: "1px solid #2a2a2a" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {election.status === "active" ? (
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground">● Live</span>
            ) : (
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full text-primary" style={{ background: "#1a2a1a" }}>◌ Expected</span>
            )}
          </div>
          <h3 className="text-lg font-bold text-foreground">{election.name}</h3>
          <p className="text-sm text-[#888888]">{formatElectionDate(election.date)}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-md text-[#888888] border border-[#2a2a2a]" style={{ background: "#1a1a1a" }}>
          {election.date.slice(0, 4)}
        </span>
      </div>

      {/* Registration deadlines */}
      <DeadlinesSection deadlines={deadlines} />

      {/* Voting methods */}
      {methods && (
        <div className="flex flex-wrap gap-2">
          {methods.byMail && (
            <span className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a2a] text-[#888888]" style={{ background: "#1a1a1a" }}>✉️ Vote by Mail Available</span>
          )}
          {methods.earlyVoting && (
            <span className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a2a] text-[#888888]" style={{ background: "#1a1a1a" }}>
              🗓️ Early Voting {methods.earlyVoting.start ? formatShortDate(methods.earlyVoting.start) : ""}{methods.earlyVoting.end ? ` – ${formatShortDate(methods.earlyVoting.end)}` : ""}
            </span>
          )}
          {methods.inPerson && (
            <span className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a2a] text-[#888888]" style={{ background: "#1a1a1a" }}>📍 In-Person Voting</span>
          )}
        </div>
      )}

      {/* Contests / Ballot */}
      {contests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">YOUR BALLOT</p>
          {(["federal", "state", "local"] as const).map((level) =>
            groupedContests[level]?.length > 0 ? (
              <div key={level} className="space-y-2">
                {groupedContests[level].map((contest, ci) => (
                  <ContestRow key={ci} contest={contest} />
                ))}
              </div>
            ) : null
          )}
          {!showAllContests && hiddenCount > 0 && (
            <button onClick={() => setShowAllContests(true)} className="text-sm text-primary hover:underline">
              Show {hiddenCount} more race{hiddenCount !== 1 ? "s" : ""} →
            </button>
          )}
        </div>
      )}

      {/* Ballot measures */}
      {measures.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">BALLOT MEASURES</p>
          {measures.map((m, mi) => (
            <MeasureRow key={mi} measure={m} />
          ))}
        </div>
      )}

      {/* Polling location */}
      {polling && polling.address && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">YOUR POLLING PLACE</p>
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderLeft: "3px solid hsl(var(--primary))" }}>
            <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1 min-w-0">
              {polling.name && <p className="text-base font-bold text-foreground">{polling.name}</p>}
              <p className="text-sm text-[#888888]">{polling.address}</p>
              {polling.hours && <p className="text-sm text-primary">{polling.hours}</p>}
              {polling.notes && <p className="text-xs text-[#555555]">{polling.notes}</p>}
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(polling.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/10 transition-colors"
              >
                Get Directions → <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-full border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
          onClick={() => onCheckReg(election.checkRegistrationUrl || "")}
        >
          ✅ Check Registration
        </Button>
        {election.registrationUrl && (
          <Button
            className="flex-1 rounded-full bg-primary text-primary-foreground font-bold gap-1.5"
            onClick={() => onRegister(election.registrationUrl!)}
          >
            📝 Register to Vote
          </Button>
        )}
      </div>

      {/* Coverage notice */}
      {election.coverage && !election.coverage.hasLocalRaces && (
        <p className="text-xs text-[#555555] italic flex items-start gap-1.5">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          Local race coverage for your area may be limited. State and federal races shown are complete.
        </p>
      )}
    </motion.div>
  );
}

/* ─── Deadlines ─── */

function DeadlinesSection({ deadlines }: { deadlines?: VoterElection["registrationDeadlines"] }) {
  if (!deadlines) return null;
  const items = [
    { icon: "📱", label: "Online", date: deadlines.online },
    { icon: "📬", label: "By Mail", date: deadlines.byMail },
    { icon: "🏛️", label: "In Person", date: deadlines.inPerson },
  ].filter((d) => d.date);

  if (items.length === 0) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">REGISTRATION DEADLINES</p>
        <p className="text-xs text-[#888888]">Deadlines not yet announced</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">REGISTRATION DEADLINES</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {items.map((item) => (
          <DeadlineCard key={item.label} icon={item.icon} label={item.label} date={item.date!} />
        ))}
      </div>
    </div>
  );
}

function DeadlineCard({ icon, label, date }: { icon: string; label: string; date: string }) {
  const past = isPast(date);
  const today = isToday(date);
  const days = daysUntil(date);

  return (
    <div className="rounded-xl p-3" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-[#888888]">{label}</span>
      </div>
      {today ? (
        <p className="text-sm font-bold text-primary">TODAY</p>
      ) : past ? (
        <div>
          <p className="text-sm text-[#888888] line-through">{formatShortDate(date)}</p>
          <span className="text-[10px] text-destructive/70 font-semibold">Passed</span>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-foreground">{formatShortDate(date)}</p>
          <p className="text-xs text-primary">{days} day{days !== 1 ? "s" : ""} away</p>
        </div>
      )}
    </div>
  );
}

/* ─── Contest row ─── */

function ContestRow({ contest }: { contest: VoterContest }) {
  const [open, setOpen] = useState(false);
  const levelLabel = contest.level?.toUpperCase() || "LOCAL";
  const levelColor = contest.level === "federal" ? "text-[#60a5fa]" : contest.level === "state" ? "text-purple-400" : "text-primary";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full rounded-xl p-3 flex items-center justify-between gap-2 hover:border-primary/30 transition-colors cursor-pointer" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${levelColor}`}>{levelLabel}</span>
          <span className="text-sm font-semibold text-foreground truncate">{contest.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {contest.candidates && <span className="text-xs text-[#888888]">{contest.candidates.length} candidate{contest.candidates.length !== 1 ? "s" : ""}</span>}
          <ChevronDown className={`h-4 w-4 text-[#888888] transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 space-y-1.5 py-2">
          {contest.candidates?.map((c, ci) => (
            <div key={ci} className="flex items-center gap-2 py-1.5">
              <span className="text-sm text-foreground">{c.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${partyPillClass(c.party)}`}>
                {c.party || "N/A"}
              </span>
              {c.incumbent && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 text-primary">Incumbent</span>
              )}
              {c.websiteUrl && (
                <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline ml-auto">
                  Website →
                </a>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ─── Ballot Measure row ─── */

function MeasureRow({ measure }: { measure: BallotMeasure }) {
  const [expanded, setExpanded] = useState(false);
  const hasSummary = measure.summary && measure.summary.length > 0;
  const truncated = hasSummary && measure.summary!.length > 100;

  return (
    <div className="rounded-xl p-3 space-y-1.5" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{measure.name}</span>
        {measure.type && <span className="text-[10px] text-[#888888] px-1.5 py-0.5 rounded border border-[#2a2a2a]">{measure.type}</span>}
      </div>
      {hasSummary && (
        <p className="text-sm text-[#888888] leading-relaxed">
          {expanded || !truncated ? measure.summary : `${measure.summary!.slice(0, 100)}…`}
          {truncated && (
            <button onClick={() => setExpanded(!expanded)} className="text-primary hover:underline ml-1 text-xs">
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
