import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Calendar, Car, Footprints, Bus, CarTaxiFront,
  Bell, CheckCircle, ExternalLink, ChevronRight, AlertCircle, Loader2, X, Copy,
  Users, FileText, Scale, Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useVoterInfo } from "@/hooks/useCivicApi";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import ElectionCountdown from "@/components/voting/ElectionCountdown";
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
        return {
          name: `${stateCode} Primary Election`,
          date: primaryStr,
          type: "primary" as const,
          description: `Primary elections for all ${stateCode} federal and state offices`,
        };
      }
    }
  }
  return {
    name: "2026 Midterm General Election",
    date: GENERAL_DATE,
    type: "general" as const,
    description: "All 435 House seats + 35 Senate seats + governor races",
  };
}

/* ─── Missouri-specific fallback races ─── */
const MO_2026_RACES = [
  {
    office: "U.S. House — District 5 (Kansas City)",
    incumbent: "Emanuel Cleaver (D)",
    ballotpedia: "https://ballotpedia.org/Missouri%27s_5th_Congressional_District_election,_2026",
    primary: "August 4, 2026",
    general: "November 3, 2026",
    competitiveness: "Lean Democratic",
  },
  {
    office: "Missouri Governor",
    incumbent: "Mike Kehoe (R)",
    ballotpedia: "https://ballotpedia.org/Missouri_gubernatorial_election,_2026",
    primary: "August 4, 2026",
    general: "November 3, 2026",
    competitiveness: "Lean Republican",
  },
  {
    office: "Missouri Attorney General",
    incumbent: "Andrew Bailey (R)",
    ballotpedia: "https://ballotpedia.org/Missouri_Attorney_General_election,_2026",
    primary: "August 4, 2026",
    general: "November 3, 2026",
    competitiveness: "Lean Republican",
  },
];

const transportOptions = [
  { value: "driving", icon: Car, label: "Driving" },
  { value: "walking", icon: Footprints, label: "Walking" },
  { value: "transit", icon: Bus, label: "Transit" },
  { value: "rideshare", icon: CarTaxiFront, label: "Ride Share" },
];

export default function VotingHubPage() {
  const { user } = useAuth();
  const { zipCode, fullAddress, city, stateCode } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const nextElection = useMemo(() => getNextElectionForState(stateCode), [stateCode]);

  // Build address for Google Civic
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
  const { candidates: bpCandidates, measures: bpMeasures, loading: bpLoading } = useBallotpediaData(stateCode || undefined, city || undefined);

  // Saved legislation for "Bills to Watch"
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

  // Load existing plan
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
      if (existingPlan.reminder_time) {
        setPlanReminder(true);
        setPlanReminderDate(new Date(existingPlan.reminder_time));
      }
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
    if (!planElectionDate) {
      setPlanElectionDate(new Date(`${nextElection.date}T00:00:00`));
    }
  }, [nextElection.date, planElectionDate]);

  const handleSavePlan = async () => {
    if (!user) return;
    const planData = {
      user_id: user.id,
      election_id: "midterms-2026",
      election_date: planElectionDate ? format(planElectionDate, "yyyy-MM-dd") : null,
      polling_location: planPollingAddress || null,
      polling_location_name: planPollingName || null,
      transport_method: planTransport || null,
      reminder_time: planReminder && planReminderDate ? planReminderDate.toISOString() : null,
      reminders_enabled: planReminder,
      status: "active",
      plan_complete: true,
      zip_code: zipCode,
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
        user_id: user.id,
        race_id: raceId,
        candidate_or_choice: candidate,
        election_id: "midterms-2026",
        zip_code: zipCode,
      }, { onConflict: "user_id,race_id" as any });
    }
    toast.success("Ballot selections saved!");
    setReviewOpen(false);
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied!");
  };

  const showMoFallback = stateCode === "MO" && bpCandidates.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6 md:space-y-8">

      {/* ═══ MIDTERMS HERO ═══ */}
      <MidtermsHero stateCode={stateCode} onAskUwazi={() => navigate(`/ask?q=${encodeURIComponent("What are the most important races in the 2026 midterm elections? What issues are at stake?")}`)} />

      {/* ═══ ELECTION COUNTDOWN ═══ */}
      <ElectionCountdown
        electionName={nextElection.name}
        electionDate={nextElection.date}
        city={city}
        stateCode={stateCode}
        zipCode={zipCode}
      />

      {/* Hero text */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-2">YOUR CIVIC ACTION CENTER</p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl text-foreground leading-none">YOUR VOTE. YOUR POWER.</h1>
        <p className="text-sm md:text-lg text-muted-foreground mt-1">Everything you need to show up and make it count.</p>
        {needsFullAddress && (
          <p className="text-xs text-muted-foreground mt-2">
            <Link to="/settings" className="text-primary hover:underline">Add or update your full address →</Link> for precise polling location and ballot data.
          </p>
        )}
      </motion.div>

      {/* ═══ POLLING LOCATION ═══ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        <h2 className="font-heading text-2xl text-foreground">YOUR POLLING LOCATION</h2>
        {needsFullAddress ? (
          <div className="rounded-card p-6 text-center space-y-3" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
            <MapPin className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-heading text-lg text-foreground">Add your address to find your polling location</h3>
            <p className="text-sm text-muted-foreground">
              {invalidVoterAddress
                ? "Your saved address could not be matched. Please update it to load your exact polling place and ballot."
                : "We need your full street address to find your exact polling place."}
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
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      {loc.locationName || loc.address?.locationName || "Polling Location"}
                    </p>
                    {fullAddr && <p className="text-xs text-muted-foreground">{fullAddr}</p>}
                    {loc.pollingHours && <p className="text-xs text-muted-foreground">🕐 Hours: {loc.pollingHours}</p>}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(fullAddr)}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="w-full sm:w-auto bg-primary text-primary-foreground text-xs gap-1">
                        <ExternalLink className="h-3 w-3" /> Get Directions
                      </Button>
                    </a>
                    <Button size="sm" variant="outline" className="text-xs gap-1 border-border" onClick={() => copyAddress(fullAddr)}>
                      <Copy className="h-3 w-3" /> Copy Address
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Honest "not available yet" ── */
          <div className="rounded-card p-6 text-center space-y-3" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="font-heading text-lg text-foreground">Polling Locations Not Published Yet</h3>
            <p className="text-sm text-muted-foreground">
              Polling locations for the {nextElection.name} are typically published 4-6 weeks before Election Day. Check back closer to {new Date(`${nextElection.date}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a href="https://vote.gov" target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs gap-1 border-border">
                  Check vote.gov <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
              {stateCode === "MO" && (
                <a href="https://www.sos.mo.gov/elections" target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="text-xs gap-1 border-border">
                    Missouri Election Site <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* ═══ VOTER REGISTRATION CHECK ═══ */}
      <RegistrationCheck stateCode={stateCode} />

      {/* ═══ VOTING PLAN BUILDER ═══ */}
      <motion.div id="voting-plan-builder" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-card p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
      >
        <h2 className="font-heading text-2xl text-foreground mb-6">VOTING PLAN BUILDER</h2>
        <div className="space-y-6">
          {/* Step 01 */}
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
                  <CalendarPicker mode="single" selected={planElectionDate} onSelect={(d) => { setPlanElectionDate(d); setDatePickerOpen(false); }} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Step 02 */}
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-card bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">02</div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-bold text-foreground">YOUR POLLING PLACE</p>
              <Input placeholder="Polling location name" value={planPollingName} onChange={(e) => setPlanPollingName(e.target.value)} className="bg-background border-border" />
              <Input placeholder="Address" value={planPollingAddress} onChange={(e) => setPlanPollingAddress(e.target.value)} className="bg-background border-border" />
            </div>
          </div>

          {/* Step 03 */}
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-card bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">03</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground mb-2">HOW ARE YOU GETTING THERE?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {transportOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setPlanTransport(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-card border transition-all text-sm ${
                      planTransport === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border hover:border-primary/30 text-muted-foreground"
                    }`}>
                    <opt.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 04 */}
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
                    <Button variant="outline" className="border-border">
                      <Bell className="h-4 w-4 mr-2" />
                      {planReminderDate ? format(planReminderDate, "PPP") : "Set reminder date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={planReminderDate} onSelect={(d) => { setPlanReminderDate(d); setReminderPickerOpen(false); }} className={cn("p-3 pointer-events-auto")} />
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
            <p className="text-sm text-primary font-medium">Your voting plan is set! See you at the polls. 🗳️</p>
          </div>
        )}
      </motion.div>

      {/* ═══ BALLOT — Google Civic contests ═══ */}
      {contests.length > 0 && (
        <BallotSection contests={contests} isDemo={false} electionDate={nextElection.date} />
      )}

      {/* ═══ BALLOTPEDIA CANDIDATES & MEASURES ═══ */}
      {(bpCandidates.length > 0 || bpMeasures.length > 0) && (
        <BallotpediaSection candidates={bpCandidates} measures={bpMeasures} />
      )}

      {/* ═══ MISSOURI FALLBACK RACES ═══ */}
      {showMoFallback && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-2xl text-foreground">YOUR LOCAL RACES</h2>
          </div>
          <p className="text-xs text-muted-foreground">Key 2026 races for Missouri. Live candidate data will replace this when available.</p>
          <div className="space-y-3">
            {MO_2026_RACES.map((race) => (
              <div key={race.office} className="rounded-card p-5 border-l-4 border-l-primary" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-sm font-bold text-foreground">{race.office}</p>
                <p className="text-xs text-muted-foreground mt-1">Incumbent: {race.incumbent}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{race.competitiveness}</span>
                  <span className="text-[10px] text-muted-foreground">Primary: {race.primary}</span>
                  <span className="text-[10px] text-muted-foreground">General: {race.general}</span>
                </div>
                <a href={race.ballotpedia} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">
                  View on Ballotpedia ↗
                </a>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══ BILLS TO WATCH ═══ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-2xl text-foreground">BILLS TO WATCH</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/legislation")}>
            Track More Bills →
          </Button>
        </div>
        {savedBills && savedBills.length > 0 ? (
          <div className="space-y-2">
            {savedBills.map((bill) => (
              <div key={bill.id} className="rounded-card p-4 flex items-center justify-between" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary">{bill.bill_id}</p>
                  <p className="text-sm text-foreground truncate">{bill.bill_title || "Untitled Bill"}</p>
                  {bill.jurisdiction && <p className="text-[10px] text-muted-foreground">{bill.jurisdiction}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {bill.bill_url && (
                    <a href={bill.bill_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="text-xs h-7 border-border">View ↗</Button>
                    </a>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs text-primary h-7"
                    onClick={() => navigate(`/ask?q=${encodeURIComponent(`Tell me about ${bill.bill_id}: ${bill.bill_title}. What does it do and where does it stand?`)}`)}>
                    Ask Uwazi
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card p-6 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-sm text-muted-foreground mb-2">No bills tracked yet.</p>
            <Button variant="outline" size="sm" className="text-xs border-border" onClick={() => navigate("/legislation")}>
              Browse Legislation →
            </Button>
          </div>
        )}
      </motion.div>

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
   MIDTERMS HERO COMPONENT
   ═══════════════════════════════════════════════ */

function MidtermsHero({ stateCode, onAskUwazi }: { stateCode?: string | null; onAskUwazi: () => void }) {
  const navigate = useNavigate();
  const stakes = [
    { number: "435", label: "House Seats", context: "All of them up for election" },
    { number: "35", label: "Senate Seats", context: "Including 2 special elections" },
    { number: "39", label: "Governor Races", context: "Across states & territories" },
    { number: "40K+", label: "Total Offices", context: "From Congress to school board" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl p-6 md:p-8"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--primary) / 0.02) 100%)",
        border: "1px solid hsl(var(--primary) / 0.2)",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4) 30%, hsl(var(--primary) / 0.4) 70%, transparent)" }} />

      <p className="eyebrow text-muted-foreground mb-1">🗳️ 2026 MIDTERM ELECTIONS</p>
      <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight">CONGRESS IS ON THE BALLOT.</h2>
      <p className="text-sm text-muted-foreground mt-1">November 3, 2026 — The most consequential midterms in decades.</p>

      {/* Stakes grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mt-5">
        {stakes.map((s) => (
          <div key={s.label} className="flex flex-col items-center rounded-xl sm:rounded-2xl py-3 px-2"
            style={{ background: "var(--card-bg, rgba(0,0,0,0.3))", border: "1px solid hsl(var(--primary) / 0.1)" }}>
            <span className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary leading-none" style={{ letterSpacing: "-0.02em" }}>
              {s.number}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-foreground mt-1">{s.label}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 text-center">{s.context}</span>
          </div>
        ))}
      </div>

      {/* Congressional control bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
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

      <div className="flex flex-col sm:flex-row gap-2 mt-5">
        <Button onClick={() => document.getElementById("voting-plan-builder")?.scrollIntoView({ behavior: "smooth" })} className="bg-primary text-primary-foreground gap-1.5">
          See Candidates in My Area →
        </Button>
        <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5" onClick={onAskUwazi}>
          Ask Uwazi About 2026 →
        </Button>
      </div>
    </motion.div>
  );
}
