import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Calendar, Car, Footprints, Bus, CarTaxiFront,
  Bell, CheckCircle, ExternalLink, ChevronRight, AlertCircle, Loader2, X, Copy,
  Users, FileText, Scale, Landmark, Globe, ClipboardCheck, Vote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useVoterInfo } from "@/hooks/useCivicApi";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import RegistrationCheck from "@/components/voting/RegistrationCheck";
import BallotSection from "@/components/voting/BallotSection";
import BallotpediaSection from "@/components/voting/BallotpediaSection";
import RepresentativesSection from "@/components/voting/RepresentativesSection";
import { useBallotpediaData } from "@/hooks/useBallotpediaData";

/* ─── 2026 election calendar ─── */
const STATE_PRIMARY_DATES_2026: Record<string, string> = {
  IL: "2026-03-17", TX: "2026-03-03", OH: "2026-05-05",
  NC: "2026-03-17", CA: "2026-06-02", FL: "2026-08-18",
  GA: "2026-05-19", PA: "2026-05-19", MI: "2026-08-04",
  MO: "2026-08-04", KS: "2026-08-04", NY: "2026-06-23",
  VA: "2026-06-09", WA: "2026-08-04", OR: "2026-05-19",
  CO: "2026-06-23", AZ: "2026-08-04", NV: "2026-06-09",
  WI: "2026-08-11", MN: "2026-08-11", IA: "2026-06-02",
  NJ: "2026-06-02", MD: "2026-07-21", MA: "2026-09-15",
};

const GENERAL_DATE = "2026-11-03";

function getNextElectionForState(stateCode?: string | null) {
  const now = new Date();
  if (stateCode) {
    const primaryStr = STATE_PRIMARY_DATES_2026[stateCode];
    if (primaryStr) {
      const primary = new Date(`${primaryStr}T00:00:00`);
      if (primary > now) {
        return { name: `${stateCode} Primary Election`, date: primaryStr, type: "primary" as const };
      }
    }
  }
  return { name: "2026 Midterm General Election", date: GENERAL_DATE, type: "general" as const };
}

/* ─── Missouri fallback races ─── */
const MO_2026_RACES = [
  { office: "U.S. House — District 5 (Kansas City)", incumbent: "Emanuel Cleaver (D)", ballotpedia: "https://ballotpedia.org/Missouri%27s_5th_Congressional_District_election,_2026", primary: "August 4, 2026", general: "November 3, 2026", competitiveness: "Lean Democratic" },
  { office: "Missouri Governor", incumbent: "Mike Kehoe (R)", ballotpedia: "https://ballotpedia.org/Missouri_gubernatorial_election,_2026", primary: "August 4, 2026", general: "November 3, 2026", competitiveness: "Lean Republican" },
  { office: "Missouri Attorney General", incumbent: "Andrew Bailey (R)", ballotpedia: "https://ballotpedia.org/Missouri_Attorney_General_election,_2026", primary: "August 4, 2026", general: "November 3, 2026", competitiveness: "Lean Republican" },
];

const transportOptions = [
  { value: "driving", icon: Car, label: "Driving" },
  { value: "walking", icon: Footprints, label: "Walking" },
  { value: "transit", icon: Bus, label: "Transit" },
  { value: "rideshare", icon: CarTaxiFront, label: "Ride Share" },
];

const VALID_TABS = ["elections", "reps", "act"] as const;
type TabValue = typeof VALID_TABS[number];

function getTabFromHash(hash: string): TabValue {
  const h = hash.replace("#", "") as TabValue;
  return VALID_TABS.includes(h) ? h : "elections";
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

export default function VotingHubPage() {
  const { user } = useAuth();
  const { zipCode, fullAddress, city, stateCode } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<TabValue>(() => getTabFromHash(location.hash));

  // Sync hash → tab on popstate
  useEffect(() => {
    setActiveTab(getTabFromHash(location.hash));
  }, [location.hash]);

  const handleTabChange = (value: string) => {
    if (value === "elections") {
      setActiveTab("elections");
      window.history.replaceState(null, "", "#elections");
    } else if (value === "reps") {
      setActiveTab("reps");
      window.history.replaceState(null, "", "#reps");
    } else if (value === "act") {
      setActiveTab("act");
      window.history.replaceState(null, "", "#act");
    }
  };

  const nextElection = useMemo(() => getNextElectionForState(stateCode), [stateCode]);

  // Google Civic
  const hasResolvableAddress = Boolean(fullAddress?.trim() || (city && stateCode && zipCode));
  const address = fullAddress?.trim() || (city && stateCode && zipCode ? `${city}, ${stateCode} ${zipCode}` : "");
  const { data: voterData, isLoading: voterLoading } = useVoterInfo(address);
  const noLiveVoterData = voterData?.status === "no_election";
  const invalidVoterAddress = voterData?.status === "invalid_address";
  const needsFullAddress = !hasResolvableAddress || invalidVoterAddress;
  const pollingLocations = voterData?.pollingLocations || [];
  const earlyVoteSites = voterData?.earlyVoteSites || [];
  const contests = voterData?.contests || [];
  const hasPollingData = pollingLocations.length > 0 || earlyVoteSites.length > 0;
  const displayPolling = pollingLocations.length > 0 ? pollingLocations : earlyVoteSites;

  // Ballotpedia data
  const { racesWithCandidates, measures: bpMeasures, loading: bpLoading } = useBallotpediaData(stateCode || undefined, city || undefined);
  const showMoFallback = stateCode === "MO" && racesWithCandidates.length === 0;

  // Saved legislation
  const { data: savedBills } = useQuery({
    queryKey: ["saved_legislation", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("saved_legislation").select("*").eq("user_id", user.id).limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  // Voting plan state
  const [planElectionDate, setPlanElectionDate] = useState<Date | undefined>();
  const [planPollingName, setPlanPollingName] = useState("");
  const [planPollingAddress, setPlanPollingAddress] = useState("");
  const [planTransport, setPlanTransport] = useState("");
  const [planReminder, setPlanReminder] = useState(false);
  const [planReminderDate, setPlanReminderDate] = useState<Date | undefined>();
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [reminderPickerOpen, setReminderPickerOpen] = useState(false);

  const { data: existingPlan } = useQuery({
    queryKey: ["voting_plan", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("voting_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (existingPlan) {
      if (existingPlan.election_date) setPlanElectionDate(new Date(existingPlan.election_date));
      if (existingPlan.polling_location) setPlanPollingAddress(existingPlan.polling_location);
      if (existingPlan.polling_location_name) setPlanPollingName(existingPlan.polling_location_name);
      if (existingPlan.transport_method) setPlanTransport(existingPlan.transport_method);
      if (existingPlan.reminder_time) { setPlanReminder(true); setPlanReminderDate(new Date(existingPlan.reminder_time)); }
    }
  }, [existingPlan]);

  useEffect(() => {
    if (displayPolling.length > 0 && !planPollingAddress) {
      const loc = displayPolling[0];
      setPlanPollingName(loc.locationName || loc.address?.locationName || "");
      const addr = loc.address;
      if (addr) setPlanPollingAddress([addr.line1, addr.city, addr.state, addr.zip].filter(Boolean).join(", "));
    }
  }, [displayPolling, planPollingAddress]);

  useEffect(() => {
    if (!planElectionDate) setPlanElectionDate(new Date(`${nextElection.date}T00:00:00`));
  }, [nextElection.date, planElectionDate]);

  const handleSavePlan = async () => {
    if (!user) return;
    const planData = {
      user_id: user.id, election_id: "midterms-2026",
      election_date: planElectionDate ? format(planElectionDate, "yyyy-MM-dd") : null,
      polling_location: planPollingAddress || null, polling_location_name: planPollingName || null,
      transport_method: planTransport || null,
      reminder_time: planReminder && planReminderDate ? planReminderDate.toISOString() : null,
      reminders_enabled: planReminder, status: "active", plan_complete: true, zip_code: zipCode,
    };
    if (existingPlan) {
      await supabase.from("voting_plans").update(planData).eq("id", existingPlan.id);
      toast.success("Voting plan updated! 🗳️");
    } else {
      await supabase.from("voting_plans").insert(planData);
      toast.success("+25 XP — Voter Ready badge earned! 🎓");
    }
    queryClient.invalidateQueries({ queryKey: ["voting_plan"] });
  };

  const handleSaveBallot = async () => {
    if (!user) return;
    for (const [raceId, candidate] of Object.entries(selectedCandidates)) {
      await supabase.from("ballot_selections").upsert({
        user_id: user.id, race_id: raceId, candidate_or_choice: candidate,
        election_id: "midterms-2026", zip_code: zipCode,
      }, { onConflict: "user_id,race_id" as any });
    }
    toast.success("Ballot selections saved!");
    setReviewOpen(false);
  };

  const copyAddress = (addr: string) => { navigator.clipboard.writeText(addr); toast.success("Address copied!"); };

  const locationString = [city, stateCode, zipCode].filter(Boolean).join(", ");

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-0">

      {/* ═══ 1. HERO ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 md:p-10 mb-4"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.02) 50%, transparent 100%)",
          border: "1px solid hsl(var(--primary) / 0.2)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4) 30%, hsl(var(--primary) / 0.4) 70%, transparent)" }} />
        <p className="eyebrow text-muted-foreground mb-2">YOUR CIVIC ACTION CENTER</p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground leading-none">YOUR VOTE. YOUR POWER.</h1>
        <p className="text-sm md:text-lg text-muted-foreground mt-2">
          Everything you need to show up{locationString ? ` · ${locationString}` : ""}
        </p>
        {needsFullAddress && (
          <p className="text-xs text-muted-foreground mt-2">
            <Link to="/settings" className="text-primary hover:underline">Add or update your full address →</Link> for precise ballot data.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          <Button
            onClick={() => { setActiveTab("elections"); window.history.replaceState(null, "", "#elections"); navigate("/vote/candidates"); }}
            className="bg-primary text-primary-foreground gap-1.5"
          >
            See candidates in my area →
          </Button>
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
            onClick={() => navigate(`/ask?q=${encodeURIComponent("What are the most important races in the 2026 midterm elections?")}`)}
          >
            Ask Uwazi about 2026 →
          </Button>
          <Button
            variant="ghost"
            className="text-foreground/80 hover:text-foreground hover:bg-muted/60 gap-1.5"
            onClick={() => {
              setActiveTab("act");
              window.history.replaceState(null, "", "#act");
              setTimeout(() => {
                document.getElementById("voting-plan-builder")?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
          >
            Set up voting plan →
          </Button>
        </div>
      </motion.div>

      {/* ═══ 2. COUNTDOWN BAR ═══ */}
      <CountdownBar nextElection={nextElection} />

      {/* ═══ 3. TABBED NAVIGATION ═══ */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6">
        <TabsList className="w-full grid grid-cols-3 h-11 bg-muted/50 rounded-xl">
          <TabsTrigger value="elections" className="text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground">
            Elections 2026
          </TabsTrigger>
          <TabsTrigger value="reps" className="text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground">
            Your Reps
          </TabsTrigger>
          <TabsTrigger value="act" className="text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground">
            Take Action
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Elections 2026 ─── */}
        <TabsContent value="elections" className="space-y-6 mt-6">
          <ElectionsTab
            stateCode={stateCode}
            racesWithCandidates={racesWithCandidates}
            bpMeasures={bpMeasures}
            bpLoading={bpLoading}
            showMoFallback={showMoFallback}
            contests={contests}
            nextElection={nextElection}
            navigate={navigate}
          />
        </TabsContent>

        {/* ─── TAB 2: Your Reps ─── */}
        <TabsContent value="reps" className="mt-6">
          <RepresentativesSection stateCode={stateCode} zipCode={zipCode} city={city} />
        </TabsContent>

        {/* ─── TAB 3: Take Action ─── */}
        <TabsContent value="act" className="mt-6">
          <TakeActionTab
            stateCode={stateCode}
            navigate={navigate}
            needsFullAddress={needsFullAddress}
            invalidVoterAddress={invalidVoterAddress}
            voterLoading={voterLoading}
            hasPollingData={hasPollingData}
            displayPolling={displayPolling}
            nextElection={nextElection}
            copyAddress={copyAddress}
            // Voting plan props
            planElectionDate={planElectionDate}
            setPlanElectionDate={setPlanElectionDate}
            planPollingName={planPollingName}
            setPlanPollingName={setPlanPollingName}
            planPollingAddress={planPollingAddress}
            setPlanPollingAddress={setPlanPollingAddress}
            planTransport={planTransport}
            setPlanTransport={setPlanTransport}
            planReminder={planReminder}
            setPlanReminder={setPlanReminder}
            planReminderDate={planReminderDate}
            setPlanReminderDate={setPlanReminderDate}
            datePickerOpen={datePickerOpen}
            setDatePickerOpen={setDatePickerOpen}
            reminderPickerOpen={reminderPickerOpen}
            setReminderPickerOpen={setReminderPickerOpen}
            existingPlan={existingPlan}
            handleSavePlan={handleSavePlan}
            savedBills={savedBills}
          />
        </TabsContent>
      </Tabs>

      {/* Review Ballot Modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-foreground">REVIEW MY BALLOT</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {Object.entries(selectedCandidates).length === 0 ? (
              <p className="text-sm text-muted-foreground">No candidates selected yet.</p>
            ) : (
              Object.entries(selectedCandidates).map(([race, candidate]) => (
                <div key={race} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-xs text-muted-foreground">{race}</p>
                    <p className="text-sm font-medium text-foreground">{candidate}</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-primary" />
                </div>
              ))
            )}
          </div>
          <Button onClick={handleSaveBallot} className="w-full bg-primary text-primary-foreground mt-2">
            Save My Selections
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COUNTDOWN BAR (slim single row)
   ═══════════════════════════════════════════════ */

function CountdownBar({ nextElection }: { nextElection: { name: string; date: string } }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const target = new Date(`${nextElection.date}T00:00:00`);
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [nextElection.date]);

  const formatted = new Date(`${nextElection.date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 px-4 py-2.5 rounded-xl"
      style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.15)" }}
    >
      <div className="flex items-center gap-2 text-sm flex-wrap min-w-0">
        <span className="text-muted-foreground font-medium shrink-0">Next election</span>
        <span className="text-foreground font-bold truncate">{nextElection.name}</span>
        <span className="text-muted-foreground shrink-0">{formatted}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          {[
            { val: timeLeft.days, lbl: "days" },
            { val: timeLeft.hours, lbl: "hrs" },
            { val: timeLeft.minutes, lbl: "min" },
          ].map((u) => (
            <div key={u.lbl} className="flex items-baseline gap-0.5">
              <span className="font-heading text-lg font-extrabold text-primary leading-none">{u.val}</span>
              <span className="text-[9px] font-semibold uppercase text-muted-foreground">{u.lbl}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 1: Elections 2026
   ═══════════════════════════════════════════════ */

function ElectionsTab({
  stateCode, racesWithCandidates, bpMeasures, bpLoading, showMoFallback, contests, nextElection, navigate,
}: {
  stateCode?: string | null;
  racesWithCandidates: any[];
  bpMeasures: any[];
  bpLoading: boolean;
  showMoFallback: boolean;
  contests: any[];
  nextElection: { name: string; date: string };
  navigate: (path: string) => void;
}) {
  const stakes = [
    { number: "435", label: "House Seats", context: "All up for election" },
    { number: "35", label: "Senate Seats", context: "Including 2 special elections" },
    { number: "39", label: "Governor Races", context: "Across states & territories" },
    { number: "40K+", label: "Total Offices", context: "Congress to school board" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats mini grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stakes.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center rounded-xl py-3 px-2"
            style={{ background: "var(--card-bg, hsl(var(--muted)))", border: "1px solid hsl(var(--primary) / 0.1)" }}
          >
            <span className="font-heading text-2xl sm:text-3xl font-extrabold text-primary leading-none">{s.number}</span>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-foreground mt-1">{s.label}</span>
            <span className="text-[9px] text-muted-foreground mt-0.5 text-center">{s.context}</span>
          </div>
        ))}
      </div>

      {/* Congressional control bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">HOUSE</p>
          <div className="flex h-7 rounded-lg overflow-hidden">
            <div className="flex items-center justify-center text-[11px] font-bold text-white" style={{ width: "49.2%", background: "#1d4ed8" }}>214 D</div>
            <div className="flex items-center justify-center text-[11px] font-bold text-white" style={{ width: "50.8%", background: "#dc2626" }}>221 R</div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Republicans hold majority — 4 seats decide control</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">SENATE</p>
          <div className="flex h-7 rounded-lg overflow-hidden">
            <div className="flex items-center justify-center text-[11px] font-bold text-white" style={{ width: "45.9%", background: "#1d4ed8" }}>45 D</div>
            <div className="flex items-center justify-center text-[11px] font-bold text-white" style={{ width: "54.1%", background: "#dc2626" }}>53 R</div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Republicans hold majority — 4 seats decide control</p>
        </div>
      </div>

      {/* Candidates section link */}
      <div
        className="rounded-card p-5 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle, hsl(var(--border)))" }}
        onClick={() => navigate("/vote/candidates")}
      >
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold text-foreground">Candidates in Your Area</p>
            <p className="text-xs text-muted-foreground">View all races grouped by Federal and State</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Google Civic contests */}
      {contests.length > 0 && (
        <BallotSection contests={contests} isDemo={false} electionDate={nextElection.date} />
      )}

      {/* Ballotpedia candidates & measures */}
      {bpLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
      ) : (racesWithCandidates.length > 0 || bpMeasures.length > 0) ? (
        <BallotpediaSection racesWithCandidates={racesWithCandidates} measures={bpMeasures} />
      ) : null}

      {/* MO fallback */}
      {showMoFallback && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-xl text-foreground">YOUR LOCAL RACES</h2>
          </div>
          <p className="text-xs text-muted-foreground">Key 2026 races for Missouri.</p>
          {MO_2026_RACES.map((race) => (
            <div key={race.office} className="rounded-card p-5 border-l-4 border-l-primary" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-sm font-bold text-foreground">{race.office}</p>
              <p className="text-xs text-muted-foreground mt-1">Incumbent: {race.incumbent}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{race.competitiveness}</span>
              </div>
              <a href={race.ballotpedia} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">View on Ballotpedia ↗</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 3: Take Action
   ═══════════════════════════════════════════════ */

function TakeActionTab({
  stateCode, navigate, needsFullAddress, invalidVoterAddress, voterLoading,
  hasPollingData, displayPolling, nextElection, copyAddress,
  planElectionDate, setPlanElectionDate, planPollingName, setPlanPollingName,
  planPollingAddress, setPlanPollingAddress, planTransport, setPlanTransport,
  planReminder, setPlanReminder, planReminderDate, setPlanReminderDate,
  datePickerOpen, setDatePickerOpen, reminderPickerOpen, setReminderPickerOpen,
  existingPlan, handleSavePlan, savedBills,
}: any) {
  /* 2x2 action cards */
  const actions = [
    {
      icon: ClipboardCheck,
      title: "Check Registration",
      desc: "Verify you're registered to vote",
      onClick: () => {},
      render: true,
    },
    {
      icon: MapPin,
      title: "Find Polling Place",
      desc: "Locate your nearest polling location",
      onClick: () => document.getElementById("polling-location-section")?.scrollIntoView({ behavior: "smooth" }),
      render: true,
    },
    {
      icon: Vote,
      title: "Build Voting Plan",
      desc: "Set a plan so you don't miss Election Day",
      onClick: () => document.getElementById("voting-plan-builder")?.scrollIntoView({ behavior: "smooth" }),
      render: true,
    },
    {
      icon: Scale,
      title: "Track Legislation",
      desc: "Follow bills that affect your community",
      onClick: () => navigate("/legislation"),
      render: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 2x2 action grid */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <button
            key={a.title}
            onClick={a.onClick}
            className="rounded-card p-5 text-left flex flex-col gap-2 hover:border-primary/30 transition-all"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle, hsl(var(--border)))" }}
          >
            <a.icon className="h-6 w-6 text-primary" />
            <p className="text-sm font-bold text-foreground">{a.title}</p>
            <p className="text-xs text-muted-foreground">{a.desc}</p>
          </button>
        ))}
      </div>

      {/* Registration check */}
      <RegistrationCheck stateCode={stateCode} />

      {/* Polling Location */}
      <div id="polling-location-section" className="space-y-4">
        <h2 className="font-heading text-xl text-foreground">YOUR POLLING LOCATION</h2>
        {needsFullAddress ? (
          <div className="rounded-card p-6 text-center space-y-3" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
            <MapPin className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-heading text-lg text-foreground">Add your address to find your polling location</h3>
            <p className="text-sm text-muted-foreground">
              {invalidVoterAddress ? "Your saved address could not be matched." : "We need your full street address."}
            </p>
            <Button onClick={() => navigate("/settings")} className="bg-primary text-primary-foreground">
              {invalidVoterAddress ? "Update My Address →" : "Add My Address →"}
            </Button>
          </div>
        ) : voterLoading ? (
          <Skeleton className="h-28 rounded-card" />
        ) : hasPollingData ? (
          <div className="space-y-3">
            {displayPolling.map((loc: any, i: number) => {
              const addr = loc.address;
              const fullAddr = addr ? [addr.line1, addr.city, addr.state, addr.zip].filter(Boolean).join(", ") : "";
              return (
                <div key={i} className="rounded-card p-5 border-l-4 border-l-primary" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" />{loc.locationName || "Polling Location"}</p>
                  {fullAddr && <p className="text-xs text-muted-foreground">{fullAddr}</p>}
                  <div className="flex gap-2 mt-3">
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(fullAddr)}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-primary text-primary-foreground text-xs gap-1"><ExternalLink className="h-3 w-3" /> Directions</Button>
                    </a>
                    <Button size="sm" variant="outline" className="text-xs gap-1 border-border" onClick={() => copyAddress(fullAddr)}><Copy className="h-3 w-3" /> Copy</Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-card p-6 text-center space-y-3" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="font-heading text-lg text-foreground">Polling Locations Not Published Yet</h3>
            <p className="text-sm text-muted-foreground">Check back closer to {new Date(`${nextElection.date}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.</p>
          </div>
        )}
      </div>

      {/* Voting Plan Builder */}
      <div id="voting-plan-builder" className="rounded-card p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
        <h2 className="font-heading text-xl text-foreground mb-6">VOTING PLAN BUILDER</h2>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-card bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">01</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground mb-2">ELECTION DAY</p>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto justify-start text-left border-border">
                    <Calendar className="h-4 w-4 mr-2" />
                    {planElectionDate ? format(planElectionDate, "PPP") : "Pick election date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={planElectionDate} onSelect={(d: any) => { setPlanElectionDate(d); setDatePickerOpen(false); }} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-card bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">02</div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-bold text-foreground">YOUR POLLING PLACE</p>
              <Input placeholder="Polling location name" value={planPollingName} onChange={(e: any) => setPlanPollingName(e.target.value)} className="bg-background border-border" />
              <Input placeholder="Address" value={planPollingAddress} onChange={(e: any) => setPlanPollingAddress(e.target.value)} className="bg-background border-border" />
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-card bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">03</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground mb-2">HOW ARE YOU GETTING THERE?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {transportOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setPlanTransport(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-card border transition-all text-sm ${planTransport === opt.value ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-primary/30 text-muted-foreground"}`}>
                    <opt.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-card bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">04</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground mb-2">SET A REMINDER</p>
              <div className="flex items-center gap-3 mb-2">
                <Switch checked={planReminder} onCheckedChange={setPlanReminder} />
                <span className="text-sm text-muted-foreground">{planReminder ? "Reminder on" : "No reminder"}</span>
              </div>
              {planReminder && (
                <Popover open={reminderPickerOpen} onOpenChange={setReminderPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="border-border"><Bell className="h-4 w-4 mr-2" />{planReminderDate ? format(planReminderDate, "PPP") : "Set reminder date"}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={planReminderDate} onSelect={(d: any) => { setPlanReminderDate(d); setReminderPickerOpen(false); }} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </div>
        <Button onClick={handleSavePlan} className="w-full mt-6 bg-primary text-primary-foreground text-base py-3 h-auto">
          {existingPlan ? "UPDATE MY VOTING PLAN" : "SAVE MY VOTING PLAN"}
        </Button>
        {existingPlan?.plan_complete && (
          <div className="flex items-center gap-2 mt-3 justify-center">
            <CheckCircle className="h-4 w-4 text-primary" />
            <p className="text-sm text-primary font-medium">Your voting plan is set! 🗳️</p>
          </div>
        )}
      </div>

      {/* Bills to Watch */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-xl text-foreground">BILLS TO WATCH</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/legislation")}>Track More →</Button>
        </div>
        {savedBills && savedBills.length > 0 ? (
          <div className="space-y-2">
            {savedBills.map((bill: any) => (
              <div key={bill.id} className="rounded-card p-4 flex items-center justify-between" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary">{bill.bill_id}</p>
                  <p className="text-sm text-foreground truncate">{bill.bill_title || "Untitled Bill"}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7 shrink-0"
                  onClick={() => navigate(`/ask?q=${encodeURIComponent(`Tell me about ${bill.bill_id}: ${bill.bill_title}`)}`)} >
                  Ask Uwazi
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card p-6 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-sm text-muted-foreground mb-2">No bills tracked yet.</p>
            <Button variant="outline" size="sm" className="text-xs border-border" onClick={() => navigate("/legislation")}>Browse Legislation →</Button>
          </div>
        )}
      </div>
    </div>
  );
}
