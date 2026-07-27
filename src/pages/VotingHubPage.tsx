import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Calendar, CheckCircle2, ChevronRight, ExternalLink,
  Phone, Globe, ShieldCheck, HelpCircle, MessageSquare, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useInAppBrowser } from "@/contexts/InAppBrowserContext";
import { cn } from "@/lib/utils";
import { MyBallotCard } from "@/components/ballot/MyBallotCard";

/* ══════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════ */

const ELECTION_DATE = "2026-08-04";
const ELECTION_LABEL = "August 4, 2026";
const GENERAL_DATE = "2026-11-03";
const SUPPORTED_STATES = ["MO", "KS"];

const REG_DEADLINES: Record<string, string> = {
  MO: "October 7 in Missouri",
  KS: "October 13 in Kansas",
};

type HubState = "LOADING" | "NO_ADDRESS" | "OUT_OF_AREA" | "READY" | "BALLOT_PENDING";

/* ══════════════════════════════════════════════════════
   DATE / NEXT-ACTION LOGIC (pure, testable)
   ══════════════════════════════════════════════════════ */

function daysBetween(from: Date, to: Date) {
  const ms = to.setHours(0, 0, 0, 0) - from.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function computeCountdownLabel(today: Date, electionDate: Date): { headline: string; isElectionDay: boolean } {
  const days = daysBetween(new Date(today), new Date(electionDate));
  if (days === 0) return { headline: "Today is Election Day", isElectionDay: true };
  if (days === 1) return { headline: "Tomorrow", isElectionDay: false };
  if (days > 0) return { headline: `${days} days away`, isElectionDay: false };
  return { headline: "Election has passed", isElectionDay: false };
}

interface NextAction {
  headline: string;
  detail?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

function computeNextAction(state: string | null, today: Date): NextAction {
  const target = new Date(`${ELECTION_DATE}T00:00:00`);
  const days = daysBetween(new Date(today), new Date(target));

  // Post-election
  if (days < 0) {
    const dl = state ? REG_DEADLINES[state] : null;
    return {
      headline: "Next up: the general election on November 3",
      detail: dl ? `Registration deadline: ${dl}.` : "Check your state registration deadline.",
    };
  }

  // Election day
  if (days === 0) {
    return {
      headline: "Polls are open today",
      detail: state === "MO" ? "Missouri polls: 6:00 AM – 7:00 PM." : "Check your county for local poll hours.",
    };
  }

  if (state === "KS") {
    const applyDeadline = new Date("2026-07-28T23:59:59");
    if (today <= applyDeadline) {
      return {
        headline: "Apply for a mail ballot by July 28",
        detail: "Your application must be received by your county election office by July 28.",
        ctaLabel: "Apply at ksvotes.org",
        ctaUrl: "https://ksvotes.org",
      };
    }
    return {
      headline: "Vote early in person — ends noon on August 3",
      detail: "Kansas advance in-person voting ends at 12:00 PM on Monday, August 3.",
    };
  }

  if (state === "MO") {
    return {
      headline: "Vote early in person — no excuse needed, through August 3",
      detail: "Missouri no-excuse in-person absentee voting runs through Monday, August 3.",
    };
  }

  return {
    headline: `Election day is ${ELECTION_LABEL}`,
    detail: "Check your local election office for details.",
  };
}

/* ══════════════════════════════════════════════════════
   HOOKS
   ══════════════════════════════════════════════════════ */

function useVoterProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["voter-profile-hub", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select(
          "user_id, full_address, address_line1, city, state_code, zip_code, county_name, election_authority_key, party_preference, registration_verified_at, us_congressional_district"
        )
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
}

function usePublishedElection(state: string | null | undefined) {
  return useQuery({
    queryKey: ["published-election", state, ELECTION_DATE],
    queryFn: async () => {
      if (!state) return null;
      const { data } = await supabase
        .from("elections_published")
        .select("*")
        .eq("state", state)
        .eq("election_date", ELECTION_DATE)
        .maybeSingle();
      return data;
    },
    enabled: !!state,
  });
}

function useBallotContests(state: string | null | undefined) {
  return useQuery({
    queryKey: ["ballot-contests", state, ELECTION_DATE],
    queryFn: async () => {
      if (!state) return [];
      const { data } = await supabase
        .from("ballot_contests")
        .select("*")
        .eq("state", state)
        .eq("election_date", ELECTION_DATE)
        .eq("contest_type", "ballot_measure")
        .order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: !!state,
  });
}

function useElectionAuthority(profile: any) {
  return useQuery({
    queryKey: ["election-authority", profile?.election_authority_key, profile?.state_code, profile?.city],
    queryFn: async () => {
      const state = profile?.state_code;
      if (!state) return null;

      // Prefer explicit key
      if (profile?.election_authority_key) {
        const { data } = await supabase
          .from("election_authorities")
          .select("*")
          .eq("key", profile.election_authority_key)
          .maybeSingle();
        if (data) return data;
      }

      // Match by city (KCMO within Jackson County)
      const city = (profile?.city || "").toLowerCase();
      if (state === "MO" && city.includes("kansas city")) {
        const { data } = await supabase
          .from("election_authorities")
          .select("*")
          .eq("key", "mo-kcmo-eb")
          .maybeSingle();
        if (data) return data;
      }
      if (state === "MO") {
        const { data } = await supabase
          .from("election_authorities")
          .select("*")
          .eq("key", "mo-jackson-eb")
          .maybeSingle();
        if (data) return data;
      }
      if (state === "KS") {
        const { data } = await supabase
          .from("election_authorities")
          .select("*")
          .eq("key", "ks-johnson-eo")
          .maybeSingle();
        if (data) return data;
      }

      // Fallback SOS
      const key = state === "MO" ? "mo-sos-fallback" : state === "KS" ? "ks-sos-fallback" : null;
      if (!key) return null;
      const { data } = await supabase
        .from("election_authorities")
        .select("*")
        .eq("key", key)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.state_code,
  });
}

/* ══════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════ */

export default function VotingHubPage() {
  const { data: profile, isLoading } = useVoterProfile();
  const { data: publishedElection } = usePublishedElection(profile?.state_code);

  const hubState: HubState = useMemo(() => {
    if (isLoading) return "LOADING";
    if (!profile) return "NO_ADDRESS";
    const addressComplete = !!(profile.address_line1 && profile.city && profile.state_code && profile.zip_code);
    if (!addressComplete) return "NO_ADDRESS";
    if (!SUPPORTED_STATES.includes(profile.state_code!)) return "OUT_OF_AREA";
    if (publishedElection?.is_published) return "READY";
    return "BALLOT_PENDING";
  }, [profile, publishedElection, isLoading]);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-10 space-y-5">
      <HeaderCountdown state={profile?.state_code || null} />

      {hubState === "NO_ADDRESS" && <NoAddressCard />}
      {hubState === "OUT_OF_AREA" && <OutOfAreaCard state={profile?.state_code || null} />}

      {(hubState === "READY" || hubState === "BALLOT_PENDING") && profile?.state_code && (
        <>
          <MyBallotCard state={profile.state_code} partyPreference={profile.party_preference} />
          <RegistrationCheckCard profile={profile} />
          <BallotMeasuresSection
            state={profile.state_code}
            partyPreference={profile.party_preference}
            fallbackSampleUrl={publishedElection?.sample_ballot_url || null}
          />
          {profile.state_code === "KS" && <KansasPartyPathCard profile={profile} />}
          <WhereToVoteCard profile={profile} />
        </>
      )}

      <AskUwaziEntry state={profile?.state_code || null} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   HEADER + COUNTDOWN + NEXT ACTION
   ══════════════════════════════════════════════════════ */

function HeaderCountdown({ state }: { state: string | null }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(`${ELECTION_DATE}T00:00:00`);
  const { headline, isElectionDay } = computeCountdownLabel(new Date(now), new Date(target));
  const nextAction = computeNextAction(state, new Date(now));

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-6 md:p-8"
      style={{
        background: "linear-gradient(135deg, rgba(155,211,75,0.10), rgba(155,211,75,0.02) 60%, transparent)",
        border: "1px solid rgba(155,211,75,0.22)",
      }}
    >
      <p className="text-xs tracking-widest uppercase text-muted-foreground">Next Election</p>
      <h1
        className="font-heading text-3xl md:text-5xl leading-none mt-1"
        style={{ letterSpacing: "-0.02em", color: "hsl(var(--foreground))" }}
      >
        {ELECTION_LABEL}
      </h1>
      <p
        className={cn("mt-2 text-lg md:text-xl font-semibold", isElectionDay && "text-primary")}
        aria-live="polite"
      >
        {headline}
      </p>

      <div
        className="mt-5 rounded-2xl p-4 md:p-5"
        style={{
          background: "rgba(155,211,75,0.08)",
          border: "1px solid rgba(155,211,75,0.28)",
        }}
      >
        <p className="text-xs tracking-widest uppercase text-primary/90 mb-1">Your next step</p>
        <p className="text-base md:text-lg font-semibold text-foreground">{nextAction.headline}</p>
        {nextAction.detail && (
          <p className="text-sm text-muted-foreground mt-1">{nextAction.detail}</p>
        )}
        {nextAction.ctaUrl && nextAction.ctaLabel && (
          <a
            href={nextAction.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-primary hover:underline"
          >
            {nextAction.ctaLabel} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </motion.section>
  );
}

/* ══════════════════════════════════════════════════════
   STATE BRANCHES
   ══════════════════════════════════════════════════════ */

function NoAddressCard() {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <h2 className="font-heading text-xl md:text-2xl text-foreground">See what's on your ballot</h2>
      <p className="text-sm text-muted-foreground mt-2">
        Add your address and we'll show you your exact ballot for August 4. ZIP codes split across voting districts,
        so we need your full address to get it right. Your address is private and never shared.
      </p>
      <Link to="/app/settings">
        <Button className="mt-4 bg-primary text-primary-foreground">Add my address</Button>
      </Link>
      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        UWAZI never sells or shares your address.
      </p>
    </div>
  );
}

function OutOfAreaCard({ state }: { state: string | null }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <h2 className="font-heading text-xl text-foreground">Ballot data isn't available for your state yet</h2>
      <p className="text-sm text-muted-foreground mt-2">
        {state
          ? `We're starting with Missouri and Kansas. ${state} is coming soon.`
          : "We're starting with Missouri and Kansas."} In the meantime, vote.gov has everything you need to
        check registration and find your polling place.
      </p>
      <a href="https://vote.gov" target="_blank" rel="noopener noreferrer">
        <Button className="mt-4 bg-primary text-primary-foreground gap-1.5">
          Go to vote.gov <ExternalLink className="h-4 w-4" />
        </Button>
      </a>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   REGISTRATION CHECK
   ══════════════════════════════════════════════════════ */

function RegistrationCheckCard({ profile }: { profile: any }) {
  const { user } = useAuth();
  const { openInAppBrowser } = useInAppBrowser();
  const { data: authority } = useElectionAuthority(profile);
  const [followUpVisible, setFollowUpVisible] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [confirmed, setConfirmed] = useState(!!profile?.registration_verified_at);

  if (confirmed) {
    return (
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: "rgba(155,211,75,0.06)", border: "1px solid rgba(155,211,75,0.25)" }}
      >
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <p className="text-sm font-medium text-foreground">Registration confirmed</p>
      </div>
    );
  }

  const handleCheck = () => {
    const url =
      authority?.lookup_url ||
      (profile?.state_code === "KS"
        ? "https://myvoteinfo.voteks.org/voterview/"
        : "https://s1.sos.mo.gov/elections/voterlookup/");
    openInAppBrowser(url);
    setTimeout(() => setFollowUpVisible(true), 1200);
  };

  const handleYes = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ registration_verified_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Couldn't save that. Try again.");
      return;
    }
    setConfirmed(true);
    toast.success("Registration confirmed");
  };

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <h2 className="font-heading text-lg md:text-xl text-foreground flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        Check your registration
      </h2>
      <p className="text-sm text-muted-foreground mt-2">
        Registration for the August 4 election has closed, but you can still confirm you're registered and find
        where you vote. We'll hand you off to your state's official voter lookup.
      </p>
      <Button onClick={handleCheck} className="mt-4 bg-primary text-primary-foreground gap-1.5">
        Check my registration <ExternalLink className="h-4 w-4" />
      </Button>

      {followUpVisible && !showPhone && (
        <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm text-foreground">Were you able to confirm you're registered?</p>
          <div className="flex gap-2 mt-3">
            <Button onClick={handleYes} size="sm" className="bg-primary text-primary-foreground">Yes</Button>
            <Button onClick={() => setShowPhone(true)} size="sm" variant="outline">Not sure</Button>
          </div>
        </div>
      )}
      {showPhone && authority?.phone && (
        <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm text-foreground">Call {authority.display_name} for help:</p>
          <a href={`tel:${authority.phone.replace(/[^\d+]/g, "")}`} className="mt-2 inline-flex items-center gap-2 text-primary font-semibold">
            <Phone className="h-4 w-4" /> {authority.phone}
          </a>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   BALLOT MEASURES
   ══════════════════════════════════════════════════════ */

function BallotMeasuresSection({
  state,
  partyPreference,
  fallbackSampleUrl,
}: {
  state: string;
  partyPreference: string | null;
  fallbackSampleUrl: string | null;
}) {
  const { data: contests = [], isLoading } = useBallotContests(state);
  const [openId, setOpenId] = useState<string | null>(null);
  const openContest = contests.find((c) => c.id === openId) || null;

  const intro =
    state === "MO"
      ? "Missouri has four constitutional amendments on this ballot. They appear on every ballot, no matter which party's primary you vote in."
      : "Kansas has one constitutional amendment on this ballot. It appears on every ballot, including for unaffiliated voters.";

  return (
    <section>
      <h2 className="font-heading text-xl md:text-2xl text-foreground mb-2">What you're voting on</h2>
      <p className="text-sm text-muted-foreground mb-4">{intro}</p>

      {isLoading ? (
        <div className="rounded-2xl h-24 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      ) : contests.length === 0 ? (
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-sm text-foreground">We're still confirming the official ballot language for your area.</p>
          <p className="text-sm text-muted-foreground mt-1">Your county election board has the full sample ballot.</p>
          {fallbackSampleUrl && (
            <a href={fallbackSampleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-primary hover:underline">
              View sample ballot <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {contests.map((c) => (
            <MeasureCard key={c.id} contest={c} onOpen={() => setOpenId(c.id)} />
          ))}
        </div>
      )}

      <MeasureDetailSheet contest={openContest} onClose={() => setOpenId(null)} />
    </section>
  );
}

function MeasureCard({ contest, onOpen }: { contest: any; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl p-5 relative transition hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div
        className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
        style={{ background: "#9BD34B" }}
        aria-hidden
      />
      <div className="pl-3 pr-8">
        <h3 className="font-heading text-lg text-foreground">{contest.measure_title}</h3>
        <div className="relative mt-1">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {contest.plain_summary || contest.measure_summary || "Details coming soon."}
          </p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2" />
    </button>
  );
}

function MeasureDetailSheet({ contest, onClose }: { contest: any | null; onClose: () => void }) {
  return (
    <Sheet open={!!contest} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[95dvh] overflow-y-auto p-0 bg-[#080808] border-t border-white/10">
        {contest && (
          <div className="max-w-3xl mx-auto px-5 py-6 space-y-6 pb-16">
            <SheetHeader className="text-left">
              <SheetTitle asChild>
                <h2 className="font-heading text-2xl md:text-3xl text-foreground">{contest.measure_title}</h2>
              </SheetTitle>
            </SheetHeader>

            {/* 2. Plain-language summary — UWAZI voice */}
            <section
              className="rounded-2xl p-5"
              style={{ background: "rgba(155,211,75,0.06)", border: "1px solid rgba(155,211,75,0.22)" }}
            >
              <p className="text-xs tracking-widest uppercase text-primary mb-2">
                UWAZI plain-language summary
              </p>
              <p className="text-base text-foreground leading-relaxed">
                {contest.plain_summary || "Coming soon — our nonpartisan summary is being finalized."}
              </p>
            </section>

            {/* 3. What your vote means */}
            {(contest.yes_means || contest.no_means) && (
              <section>
                <h3 className="font-heading text-lg text-foreground mb-3">What your vote means</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <VoteMeaningCard label="Vote YES" text={contest.yes_means} />
                  <VoteMeaningCard label="Vote NO" text={contest.no_means} />
                </div>
              </section>
            )}

            {/* 4. Supporters / Opponents — both or neither */}
            <SupportersOpponents supporters={contest.supporters_say} opponents={contest.opponents_say} />

            {/* 5. Official ballot language */}
            {contest.measure_summary && (
              <section>
                <p className="text-xs tracking-widest uppercase text-muted-foreground mb-2">
                  Official ballot language
                </p>
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "#111",
                    border: "1px dashed rgba(255,255,255,0.18)",
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                >
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {contest.measure_summary}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This is the exact wording that will appear on your ballot.
                </p>
              </section>
            )}

            {/* 6. Footer sources */}
            <footer className="flex flex-wrap gap-4 pt-2 border-t border-white/10 text-sm">
              {contest.source_url && (
                <a href={contest.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1.5">
                  {contest.source_name || "Source"} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {contest.measure_full_text_url && (
                <a href={contest.measure_full_text_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1.5">
                  Read the full text <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </footer>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function VoteMeaningCard({ label, text }: { label: string; text: string | null }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}
    >
      <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground leading-relaxed">{text || "—"}</p>
    </div>
  );
}

/** Both or neither — a contract, not a convention. */
function SupportersOpponents({ supporters, opponents }: { supporters: string | null; opponents: string | null }) {
  if (!supporters || !opponents) return null;
  return (
    <section>
      <h3 className="font-heading text-lg text-foreground mb-1">What each side says</h3>
      <p className="text-xs text-muted-foreground mb-3">
        These are the arguments each campaign makes. UWAZI does not take a position.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Supporters say</p>
          <p className="text-sm text-foreground leading-relaxed">{supporters}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Opponents say</p>
          <p className="text-sm text-foreground leading-relaxed">{opponents}</p>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   KANSAS UNAFFILIATED PATH
   ══════════════════════════════════════════════════════ */

function KansasPartyPathCard({ profile }: { profile: any }) {
  const { user } = useAuth();
  const [selection, setSelection] = useState<string | null>(profile?.party_preference || null);

  const setParty = async (v: string) => {
    setSelection(v);
    if (user) {
      await supabase.from("profiles").update({ party_preference: v }).eq("user_id", user.id);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-sm text-foreground font-medium">Are you registered with a political party?</p>
        <p className="text-xs text-muted-foreground mt-1">Kansas voters affiliate with a party at registration.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {[
            { v: "republican", label: "Republican" },
            { v: "democratic", label: "Democratic" },
            { v: "unaffiliated", label: "Unaffiliated" },
            { v: "not_sure", label: "Not sure" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setParty(o.v)}
              className={cn(
                "rounded-lg py-2.5 px-3 text-sm font-medium transition",
                selection === o.v
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/[0.04] text-foreground hover:bg-white/[0.08] border border-white/10"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {selection === "unaffiliated" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, rgba(155,211,75,0.14), rgba(155,211,75,0.05))",
            border: "1px solid rgba(155,211,75,0.35)",
          }}
        >
          <h3 className="font-heading text-xl text-foreground">You can still vote on August 4</h3>
          <p className="text-sm text-foreground/90 mt-2">
            Unaffiliated voters in Kansas receive a ballot with the statewide constitutional amendment. You don't
            need to join a party to vote on it.
          </p>
          <Button
            className="mt-4 bg-primary text-primary-foreground"
            onClick={() => document.getElementById("what-youre-voting-on")?.scrollIntoView({ behavior: "smooth" })}
          >
            See the amendment
          </Button>
        </motion.div>
      )}
      {selection === "not_sure" && (
        <p className="text-sm text-muted-foreground px-1">
          <Link to="#" onClick={(e) => { e.preventDefault(); document.querySelector("[data-registration-check]")?.scrollIntoView({ behavior: "smooth" }); }} className="text-primary hover:underline">
            Use the registration lookup above
          </Link>{" "}
          to see your party affiliation on file.
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   WHERE TO VOTE
   ══════════════════════════════════════════════════════ */

function WhereToVoteCard({ profile }: { profile: any }) {
  const { data: authority } = useElectionAuthority(profile);
  const state = profile?.state_code;

  const optionsCopy =
    state === "MO"
      ? "In-person early voting runs through August 3. No excuse needed. On August 4, polls are open 6:00 AM to 7:00 PM."
      : "In-person advance voting runs through noon on August 3. Mail ballots must be received by your county election office by Election Day — if you're within a week, hand-deliver it.";

  return (
    <section>
      <h2 className="font-heading text-xl md:text-2xl text-foreground mb-3">Where to vote</h2>

      <div
        className="rounded-2xl p-5 mb-3"
        style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-sm text-foreground leading-relaxed">{optionsCopy}</p>
        {state === "KS" && !authority?.poll_hours && (
          <p className="text-xs text-muted-foreground mt-2">
            Check with your county election office for poll hours.
          </p>
        )}
      </div>

      {authority && (
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-xs tracking-widest uppercase text-primary mb-1">Your election office</p>
          <h3 className="font-heading text-lg text-foreground">{authority.display_name}</h3>
          {authority.covers_note && (
            <p className="text-sm text-muted-foreground mt-1">{authority.covers_note}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-3">
            {authority.phone && (
              <a href={`tel:${authority.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <Phone className="h-4 w-4" /> {authority.phone}
              </a>
            )}
            {authority.website && (
              <a href={authority.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <Globe className="h-4 w-4" /> Website
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   ASK UWAZI ENTRY
   ══════════════════════════════════════════════════════ */

function AskUwaziEntry({ state }: { state: string | null }) {
  const navigate = useNavigate();
  const suggestions = useMemo(() => {
    const base = ["What's on my ballot?", "Where do I vote?"];
    if (state === "MO") base.push("What does Amendment 4 do?");
    else if (state === "KS") base.push("What does the amendment do?");
    base.push("I missed the registration deadline — what now?");
    return base;
  }, [state]);

  const ask = (q: string) => navigate(`/app/ask?q=${encodeURIComponent(q)}`);

  return (
    <section>
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h2 className="font-heading text-lg text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Questions about voting?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ask Uwazi can help with deadlines, your ballot, and where to vote.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
          {suggestions.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="text-left rounded-lg px-4 py-3 text-sm text-foreground bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
