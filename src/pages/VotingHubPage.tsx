import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Calendar, Car, Footprints, Bus, CarTaxiFront,
  Bell, CheckCircle, ExternalLink, ChevronRight, AlertCircle, Loader2, X,
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
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

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

function partyColor(party: string) {
  const p = (party || "").toLowerCase();
  if (p.includes("dem")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (p.includes("rep")) return "bg-red-500/20 text-red-400 border-red-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export default function VotingHubPage() {
  const { user } = useAuth();
  const { zipCode, streetAddress } = useCivicLocation();
  const queryClient = useQueryClient();

  const address = streetAddress ? `${streetAddress}, ${zipCode}` : zipCode ? `${zipCode} USA` : "";
  const { data: electionsData, isLoading: electionsLoading, error: electionsError } = useElections();
  const { data: voterData, isLoading: voterLoading } = useVoterInfo(address);

  const liveElections = (electionsData?.elections || []).filter((e: any) => e.id !== "2000");
  const noLiveVoterData = voterData?.status === "no_election";
  const isDemo = !!electionsError || (!electionsLoading && liveElections.length === 0) || (!!address && noLiveVoterData);
  const elections = isDemo ? demoElections : liveElections;
  const pollingLocations = isDemo ? [demoPolling] : (voterData?.pollingLocations || []);
  const contests = isDemo ? demoContests : (voterData?.contests || []);
  const demoBannerMessage = noLiveVoterData
    ? "No active election data is available for your address right now. Showing sample data below."
    : "Live election data requires a Google Civic API key. Showing sample data below.";

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

  // Pre-fill from API
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

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Demo banner */}
      {isDemo && (
        <div className="bg-card border border-primary/30 rounded-card p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            {demoBannerMessage}
          </p>
        </div>
      )}

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-2">YOUR CIVIC ACTION CENTER</p>
        <h1 className="font-heading text-5xl md:text-6xl text-foreground leading-none">YOUR VOTE. YOUR POWER.</h1>
        <p className="text-lg text-muted-foreground mt-1">Everything you need to show up and make it count.</p>
        {zipCode && (
          <div className="flex items-center gap-2 mt-3">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Showing election data for <span className="text-primary font-semibold">{zipCode}</span>
            </span>
            <Link to="/settings" className="text-xs text-primary hover:underline ml-1">Change Location →</Link>
          </div>
        )}
        {!streetAddress && zipCode && (
          <p className="text-xs text-muted-foreground mt-1">
            <Link to="/settings" className="text-primary hover:underline">Add your street address →</Link> for more precise polling location data.
          </p>
        )}
      </motion.div>

      {/* SECTION 1: UPCOMING ELECTIONS */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        <h2 className="font-heading text-2xl text-foreground">UPCOMING ELECTIONS</h2>
        {electionsLoading && !isDemo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-card" />)}
          </div>
        ) : elections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {elections.map((election: any) => {
              const elDate = new Date(election.electionDay);
              const daysUntil = differenceInDays(elDate, new Date());
              return (
                <div key={election.id} className="bg-card rounded-card p-5 border border-border hover:border-primary/30 transition-all">
                  <p className="text-sm font-bold text-foreground mb-2">{election.name}</p>
                  <p className="text-2xl font-heading text-primary">{format(elDate, "MMM d, yyyy")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {daysUntil > 0 ? `in ${daysUntil} days` : daysUntil === 0 ? "Today!" : "Past"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-card p-6 border border-border text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm mb-2">No upcoming elections found for your area.</p>
            <a href="https://vote.gov" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              Check vote.gov →
            </a>
          </div>
        )}
      </motion.div>

      {/* SECTION 2: POLLING LOCATION */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
        <h2 className="font-heading text-2xl text-foreground">YOUR POLLING LOCATION</h2>
        {voterLoading && !isDemo ? (
          <Skeleton className="h-28 rounded-card" />
        ) : pollingLocations.length > 0 ? (
          <div className="space-y-3">
            {pollingLocations.map((loc: any, i: number) => {
              const addr = loc.address;
              const fullAddr = addr ? [addr.line1, addr.city, addr.state, addr.zip].filter(Boolean).join(", ") : "";
              return (
                <div key={i} className="bg-card rounded-card p-5 border-l-4 border-l-primary border border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        {loc.locationName || loc.address?.locationName || "Polling Location"}
                      </p>
                      {fullAddr && <p className="text-xs text-muted-foreground mt-1">{fullAddr}</p>}
                      {loc.pollingHours && <p className="text-xs text-muted-foreground mt-0.5">Hours: {loc.pollingHours}</p>}
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(fullAddr)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button size="sm" className="bg-primary text-primary-foreground text-xs gap-1">
                        <ExternalLink className="h-3 w-3" /> Directions
                      </Button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-card p-6 border border-border text-center">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm mb-2">Polling location not yet available for this election.</p>
            <a href="https://vote.gov" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              Check vote.gov or your county election office →
            </a>
          </div>
        )}
      </motion.div>

      {/* SECTION 3: VOTING PLAN BUILDER */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-card p-6 border border-border"
      >
        <h2 className="font-heading text-2xl text-foreground mb-6">VOTING PLAN BUILDER</h2>
        <div className="space-y-6">
          {/* Step 01 - Election Day */}
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

          {/* Step 02 - Polling Place */}
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-card bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">02</div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-bold text-foreground">YOUR POLLING PLACE</p>
              <Input placeholder="Polling location name" value={planPollingName} onChange={(e) => setPlanPollingName(e.target.value)} className="bg-background border-border" />
              <Input placeholder="Address" value={planPollingAddress} onChange={(e) => setPlanPollingAddress(e.target.value)} className="bg-background border-border" />
            </div>
          </div>

          {/* Step 03 - Transport */}
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

          {/* Step 04 - Reminder */}
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

      {/* SECTION 4: BALLOT INFORMATION */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-4">
        <h2 className="font-heading text-2xl text-foreground">YOUR BALLOT</h2>
        {contests.length > 0 ? (
          <>
            <div className="space-y-4">
              {contests.map((contest: any, ci: number) => (
                <div key={ci} className="bg-card rounded-card p-5 border border-border">
                  <p className="text-sm font-bold text-foreground mb-1">{contest.office}</p>
                  {contest.district?.name && (
                    <p className="text-xs text-muted-foreground mb-3">{contest.district.name}</p>
                  )}
                  <div className="space-y-2">
                    {(contest.candidates || []).map((c: any) => {
                      const raceKey = contest.office;
                      const isSelected = selectedCandidates[raceKey] === c.name;
                      return (
                        <button key={c.name} onClick={() => setSelectedCandidates((p) => ({ ...p, [raceKey]: c.name }))}
                          className={`w-full text-left px-4 py-3 rounded-card border transition-all text-sm flex items-center justify-between ${
                            isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                          }`}>
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-foreground">{c.name}</span>
                            {c.party && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-pill border ${partyColor(c.party)}`}>
                                {c.party}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {c.candidateUrl && (
                              <a href={c.candidateUrl} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()} className="text-xs text-primary hover:underline">
                                Learn More
                              </a>
                            )}
                            {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => setReviewOpen(true)} variant="outline" className="w-full border-primary text-primary">
              REVIEW MY BALLOT
            </Button>
          </>
        ) : (
          <div className="bg-card rounded-card p-6 border border-border text-center">
            <p className="text-muted-foreground text-sm">No ballot information available yet.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          UWAZI does not endorse any candidate or party. This information is sourced from official government data.
        </p>
      </motion.div>

      {/* SECTION 5: VOTER REGISTRATION */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="bg-card rounded-card p-6 border border-border">
          <h3 className="font-heading text-xl text-foreground mb-2">ARE YOU REGISTERED?</h3>
          <p className="text-sm text-muted-foreground mb-4">Verify your registration before election day.</p>
          <a href="https://www.vote.org/am-i-registered-to-vote/" target="_blank" rel="noopener noreferrer">
            <Button className="bg-primary text-primary-foreground gap-1.5">
              Check My Registration <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
        <div className="bg-card rounded-card p-6 border border-border">
          <h3 className="font-heading text-xl text-foreground mb-2">REGISTER TO VOTE</h3>
          <p className="text-sm text-muted-foreground mb-4">Deadlines vary by state. Don't wait.</p>
          <a href="https://vote.gov" target="_blank" rel="noopener noreferrer">
            <Button className="bg-primary text-primary-foreground gap-1.5">
              Register Now <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
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
