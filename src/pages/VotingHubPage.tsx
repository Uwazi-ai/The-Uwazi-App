import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Calendar, Car, Footprints, Bus, CarTaxiFront,
  Bell, CheckCircle, ExternalLink, ChevronRight, AlertCircle, Loader2, X, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useElections, useVoterInfo } from "@/hooks/useCivicApi";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import ElectionCountdown from "@/components/voting/ElectionCountdown";
import RegistrationCheck from "@/components/voting/RegistrationCheck";
import BallotSection from "@/components/voting/BallotSection";
import BallotpediaSection from "@/components/voting/BallotpediaSection";
import { useBallotpediaData } from "@/hooks/useBallotpediaData";

// Demo data
const demoElections = [
  { id: "demo-1", name: "Kansas City Municipal Election", electionDay: "2025-04-08" },
  { id: "demo-2", name: "2026 General Election", electionDay: "2026-11-03" },
];
const demoPolling = { locationName: "KC Community Center", address: { line1: "123 Main St", city: "Kansas City", state: "MO", zip: "64106" } };
const demoContests = [
  { office: "Mayor of Kansas City", district: { name: "City Wide" }, candidates: [
    { name: "Sarah Johnson", party: "Democratic", candidateUrl: "" },
    { name: "Marcus Williams", party: "Republican", candidateUrl: "" },
  ]},
  { office: "City Council District 3", district: { name: "District 3" }, candidates: [
    { name: "Alex Rivera", party: "Independent", candidateUrl: "" },
    { name: "Kim Chen", party: "Democratic", candidateUrl: "" },
  ]},
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

  // Build a parseable address for Google Civic — ZIP alone causes "Failed to parse address"
  const hasResolvableAddress = Boolean(fullAddress?.trim() || (city && stateCode && zipCode));
  const address = fullAddress?.trim()
    || (city && stateCode && zipCode ? `${city}, ${stateCode} ${zipCode}` : "");
  const { data: electionsData, isLoading: electionsLoading, error: electionsError } = useElections();
  const { data: voterData, isLoading: voterLoading } = useVoterInfo(address);

  const { candidates: bpCandidates, measures: bpMeasures, loading: bpLoading } = useBallotpediaData(stateCode || undefined, city || undefined);
  const liveElections = (electionsData?.elections || []).filter((e: any) => e.id !== "2000");
  const noLiveVoterData = voterData?.status === "no_election";
  const invalidVoterAddress = voterData?.status === "invalid_address";
  const needsFullAddress = !hasResolvableAddress || invalidVoterAddress;
  const isDemo = !!electionsError || (!electionsLoading && liveElections.length === 0) || (hasResolvableAddress && noLiveVoterData);
  const elections = isDemo ? demoElections : liveElections;
  const pollingLocations = isDemo ? [demoPolling] : (voterData?.pollingLocations || []);
  const contests = isDemo ? demoContests : (voterData?.contests || []);
  const demoBannerMessage = noLiveVoterData
    ? "No active election data is available for your address right now. Showing sample data below."
    : "Live election data requires a Google Civic API key. Showing sample data below.";

  // Next election for countdown
  const nextElection = elections[0];
  const nextElectionDate = nextElection?.electionDay || "2026-11-03";
  const nextElectionName = nextElection?.name || "2026 General Election";

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
      if ((existingPlan as any).polling_location_name) setPlanPollingName((existingPlan as any).polling_location_name);
      if (existingPlan.transport_method) setPlanTransport(existingPlan.transport_method);
      if (existingPlan.reminder_time) {
        setPlanReminder(true);
        setPlanReminderDate(new Date(existingPlan.reminder_time));
      }
    }
  }, [existingPlan]);

  useEffect(() => {
    if (pollingLocations.length > 0 && !planPollingAddress) {
      const loc = pollingLocations[0];
      setPlanPollingName(loc.locationName || loc.address?.locationName || "");
      const addr = loc.address;
      if (addr) setPlanPollingAddress([addr.line1, addr.city, addr.state, addr.zip].filter(Boolean).join(", "));
    }
  }, [pollingLocations, planPollingAddress]);

  useEffect(() => {
    if (elections.length > 0 && !planElectionDate) {
      const first = elections[0];
      if (first.electionDay) setPlanElectionDate(new Date(first.electionDay));
    }
  }, [elections, planElectionDate]);

  const handleSavePlan = async () => {
    if (!user) return;
    const planData = {
      user_id: user.id,
      election_id: elections[0]?.id || "manual",
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
        election_id: elections[0]?.id || "manual",
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

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6 md:space-y-8">
      {/* Demo banner */}
      {isDemo && (
        <div className="bg-card border border-primary/30 rounded-card p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">{demoBannerMessage}</p>
        </div>
      )}

      {/* ELECTION COUNTDOWN HERO */}
      <ElectionCountdown
        electionName={nextElectionName}
        electionDate={nextElectionDate}
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

      {/* POLLING LOCATION */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        <h2 className="font-heading text-2xl text-foreground">YOUR POLLING LOCATION</h2>
        {needsFullAddress ? (
          <div className="rounded-card p-6 text-center space-y-3" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
            <MapPin className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-heading text-lg text-foreground">Add your address to find your polling location</h3>
            <p className="text-sm text-muted-foreground">{invalidVoterAddress ? "Your saved address could not be matched. Please update it to load your exact polling place and ballot." : "We need your full street address to find your exact polling place."}</p>
            <Button onClick={() => navigate("/settings")} className="bg-primary text-primary-foreground">{invalidVoterAddress ? "Update My Address →" : "Add My Address →"}</Button>
          </div>
        ) : voterLoading && !isDemo ? (
          <Skeleton className="h-28 rounded-card" />
        ) : pollingLocations.length > 0 ? (
          <div className="space-y-3">
            {pollingLocations.map((loc: any, i: number) => {
              const addr = loc.address;
              const fullAddr = addr ? [addr.line1, addr.city, addr.state, addr.zip].filter(Boolean).join(", ") : "";
              return (
                <div key={i} className="rounded-card p-5 border-l-4 border-l-primary" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        {loc.locationName || loc.address?.locationName || "Polling Location"}
                      </p>
                      {fullAddr && <p className="text-xs text-muted-foreground">{fullAddr}</p>}
                      {loc.pollingHours && <p className="text-xs text-muted-foreground">🕐 Hours: {loc.pollingHours}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(fullAddr)}`} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
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
          <div className="rounded-card p-6 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm mb-2">Polling location not yet available for this election.</p>
            <a href="https://vote.gov" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              Check vote.gov or your county election office →
            </a>
          </div>
        )}
      </motion.div>

      {/* VOTER REGISTRATION CHECK */}
      <RegistrationCheck stateCode={stateCode} />

      {/* VOTING PLAN BUILDER */}
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
                  <CalendarPicker mode="single" selected={planElectionDate} onSelect={(d) => { setPlanElectionDate(d); setDatePickerOpen(false); }}
                    className={cn("p-3 pointer-events-auto")} />
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
                    <CalendarPicker mode="single" selected={planReminderDate} onSelect={(d) => { setPlanReminderDate(d); setReminderPickerOpen(false); }}
                      className={cn("p-3 pointer-events-auto")} />
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

      {/* BALLOT */}
      <BallotSection
        contests={contests}
        isDemo={isDemo}
        electionDate={nextElectionDate}
      />

      {/* BALLOTPEDIA ENRICHED DATA */}
      {(bpCandidates.length > 0 || bpMeasures.length > 0) && (
        <BallotpediaSection candidates={bpCandidates} measures={bpMeasures} />
      )}

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
