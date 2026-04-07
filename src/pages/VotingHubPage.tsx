import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, Clock, MapPin, FileText, CheckCircle2, 
  ChevronRight, Vote, Shield, AlertCircle, CreditCard, Search, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBillSearch } from "@/hooks/useLegiScan";
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { Link } from "react-router-dom";

const electionDate = new Date("2026-11-03");
const getDaysUntil = () => Math.max(0, Math.ceil((electionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

const deadlines = [
  { label: "Voter Registration", date: "Oct 5, 2026", status: "upcoming", icon: FileText },
  { label: "Absentee Ballot Request", date: "Oct 15, 2026", status: "upcoming", icon: Calendar },
  { label: "Early Voting Begins", date: "Oct 19, 2026", status: "upcoming", icon: Vote },
  { label: "Election Day", date: "Nov 3, 2026", status: "upcoming", icon: CheckCircle2 },
];

const ballotItems = [
  { office: "Governor", candidates: 4, type: "Race" },
  { office: "State Senate District 12", candidates: 2, type: "Race" },
  { office: "Proposition 4: Education Funding", candidates: 0, type: "Measure" },
  { office: "Proposition 7: Transit Bond", candidates: 0, type: "Measure" },
];

const votingChecklist = [
  { task: "Confirm registration", done: false },
  { task: "Review ballot items", done: false },
  { task: "Find your polling location", done: false },
  { task: "Check ID requirements", done: false },
  { task: "Set election day reminder", done: false },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY"
];

// Simple ZIP-to-state abbreviation mapping (first digit of ZIP)
function zipToStateAbbr(zip: string): string | null {
  const prefix = parseInt(zip.substring(0, 3));
  if (prefix >= 10 && prefix <= 69) return "CT";
  if (prefix >= 100 && prefix <= 149) return "NY";
  if (prefix >= 150 && prefix <= 196) return "PA";
  if (prefix >= 200 && prefix <= 205) return "DC";
  if (prefix >= 206 && prefix <= 219) return "MD";
  if (prefix >= 220 && prefix <= 246) return "VA";
  if (prefix >= 247 && prefix <= 268) return "WV";
  if (prefix >= 270 && prefix <= 289) return "NC";
  if (prefix >= 290 && prefix <= 299) return "SC";
  if (prefix >= 300 && prefix <= 319) return "GA";
  if (prefix >= 320 && prefix <= 349) return "FL";
  if (prefix >= 350 && prefix <= 369) return "AL";
  if (prefix >= 370 && prefix <= 385) return "TN";
  if (prefix >= 386 && prefix <= 397) return "MS";
  if (prefix >= 400 && prefix <= 427) return "KY";
  if (prefix >= 430 && prefix <= 459) return "OH";
  if (prefix >= 460 && prefix <= 479) return "IN";
  if (prefix >= 480 && prefix <= 499) return "MI";
  if (prefix >= 500 && prefix <= 528) return "IA";
  if (prefix >= 530 && prefix <= 549) return "WI";
  if (prefix >= 550 && prefix <= 567) return "MN";
  if (prefix >= 570 && prefix <= 577) return "SD";
  if (prefix >= 580 && prefix <= 588) return "ND";
  if (prefix >= 590 && prefix <= 599) return "MT";
  if (prefix >= 600 && prefix <= 629) return "IL";
  if (prefix >= 630 && prefix <= 658) return "MO";
  if (prefix >= 660 && prefix <= 679) return "KS";
  if (prefix >= 680 && prefix <= 693) return "NE";
  if (prefix >= 700 && prefix <= 714) return "LA";
  if (prefix >= 716 && prefix <= 729) return "AR";
  if (prefix >= 730 && prefix <= 749) return "OK";
  if (prefix >= 750 && prefix <= 799) return "TX";
  if (prefix >= 800 && prefix <= 816) return "CO";
  if (prefix >= 820 && prefix <= 831) return "WY";
  if (prefix >= 832 && prefix <= 838) return "ID";
  if (prefix >= 840 && prefix <= 847) return "UT";
  if (prefix >= 850 && prefix <= 865) return "AZ";
  if (prefix >= 870 && prefix <= 884) return "NM";
  if (prefix >= 889 && prefix <= 898) return "NV";
  if (prefix >= 900 && prefix <= 961) return "CA";
  if (prefix >= 967 && prefix <= 968) return "HI";
  if (prefix >= 970 && prefix <= 979) return "OR";
  if (prefix >= 980 && prefix <= 994) return "WA";
  if (prefix >= 995 && prefix <= 999) return "AK";
  return null;
}

export default function VotingHubPage() {
  const daysLeft = getDaysUntil();
  const { zipCode, loading: locationLoading } = useCivicLocation();
  
  // Derive state from ZIP if available
  const derivedState = zipCode ? zipToStateAbbr(zipCode) : null;
  
  const [billState, setBillState] = useState(derivedState || "CA");
  const [billQuery, setBillQuery] = useState("");
  const [searchTrigger, setSearchTrigger] = useState("");
  const { data: billResults, isLoading: billsLoading, error: billsError } = useBillSearch(billState, searchTrigger);

  // Update bill state when ZIP-derived state changes
  useState(() => {
    if (derivedState && derivedState !== billState) {
      setBillState(derivedState);
    }
  });

  const handleBillSearch = () => {
    if (billQuery.trim()) setSearchTrigger(billQuery.trim());
  };

  const bills = billResults?.searchresult
    ? Object.values(billResults.searchresult).filter((b: any) => typeof b === "object" && b.bill_id)
    : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Voting Hub</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Everything you need to vote with confidence</p>
      </motion.div>

      {/* Location Banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        {!locationLoading && (
          zipCode ? (
            <div className="flex items-center justify-between px-4 py-3 bg-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  📍 Showing civic information for <span className="font-bold text-primary">{zipCode}</span>
                </span>
              </div>
              <Link to="/profile" className="text-xs text-primary hover:underline font-medium">
                Change location
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  📍 Set your ZIP code to see your local races and ballot measures.
                </span>
              </div>
              <Link to="/profile" className="text-xs text-primary hover:underline font-semibold">
                Set My Location →
              </Link>
            </div>
          )
        )}
      </motion.div>

      {/* Countdown Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="gradient-civic rounded-2xl p-5 text-primary-foreground shadow-elevated"
      >
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-civic-gold" />
          <span className="text-xs font-medium uppercase tracking-wider opacity-80">2026 General Election</span>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-extrabold">{daysLeft}</span>
          <span className="text-base opacity-80">days until Election Day</span>
        </div>
        <p className="text-sm opacity-60">November 3, 2026</p>
      </motion.div>

      {/* Bill Search */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" /> Search Legislation
        </h2>
        <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
          <div className="flex gap-2">
            <select
              value={billState}
              onChange={(e) => setBillState(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Input
              placeholder="Search bills (e.g. education, housing)..."
              value={billQuery}
              onChange={(e) => setBillQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBillSearch()}
              className="flex-1"
            />
            <Button onClick={handleBillSearch} disabled={billsLoading || !billQuery.trim()}>
              {billsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {billsError && (
            <p className="text-sm text-destructive">Error: {(billsError as Error).message}</p>
          )}

          {bills.length > 0 && (
            <div className="divide-y divide-border">
              {(bills as any[]).slice(0, 10).map((bill: any) => (
                <div key={bill.bill_id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{bill.bill_number}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{bill.title}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      {bill.state}
                    </span>
                  </div>
                  {bill.last_action && (
                    <p className="text-[11px] text-muted-foreground mt-1">Last action: {bill.last_action}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchTrigger && !billsLoading && bills.length === 0 && !billsError && (
            <p className="text-sm text-muted-foreground text-center py-4">No bills found for "{searchTrigger}" in {billState}</p>
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-3"
      >
        <button className="flex items-center gap-3 p-4 bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-secondary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Check Registration</p>
            <p className="text-[11px] text-muted-foreground">Verify your status</p>
          </div>
        </button>
        <button className="flex items-center gap-3 p-4 bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="h-10 w-10 rounded-xl bg-civic-gold/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-civic-gold" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Polling Location</p>
            <p className="text-[11px] text-muted-foreground">Find where to vote</p>
          </div>
        </button>
        <button className="flex items-center gap-3 p-4 bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">ID Requirements</p>
            <p className="text-[11px] text-muted-foreground">What to bring</p>
          </div>
        </button>
        <button className="flex items-center gap-3 p-4 bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="h-10 w-10 rounded-xl bg-civic-teal/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-civic-teal" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Absentee Voting</p>
            <p className="text-[11px] text-muted-foreground">Mail-in options</p>
          </div>
        </button>
      </motion.div>

      {/* Key Deadlines */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-civic-gold" /> Key Deadlines
        </h2>
        <div className="bg-card rounded-xl shadow-card divide-y divide-border">
          {deadlines.map((d, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <d.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.date}</p>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-civic-gold/10 text-civic-gold">Upcoming</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Your Ballot Preview */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Vote className="h-4 w-4 text-primary" /> Your Ballot Preview
          {zipCode && <span className="text-xs font-normal text-muted-foreground ml-1">for {zipCode}</span>}
        </h2>
        <div className="space-y-2">
          {ballotItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.office}</p>
                <p className="text-xs text-muted-foreground">
                  {item.type === "Race" ? `${item.candidates} candidates` : "Yes / No vote"}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-primary/10 text-primary">{item.type}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Voting Plan Checklist */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-civic-success" /> Your Voting Plan
        </h2>
        <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
          {votingChecklist.map((item, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer">
              <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                item.done ? "bg-civic-success border-civic-success" : "border-border hover:border-primary"
              }`}>
                {item.done && <CheckCircle2 className="h-3.5 w-3.5 text-secondary-foreground" />}
              </div>
              <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.task}</span>
            </label>
          ))}
          <div className="pt-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-civic-success rounded-full transition-all" style={{ width: "0%" }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">0 of {votingChecklist.length} completed</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
