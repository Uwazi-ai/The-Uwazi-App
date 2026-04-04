import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, Clock, MapPin, FileText, CheckCircle2, 
  ChevronRight, Vote, Shield, AlertCircle, CreditCard, Search, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBillSearch } from "@/hooks/useLegiScan";

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

export default function VotingHubPage() {
  const daysLeft = getDaysUntil();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Voting Hub</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Everything you need to vote with confidence</p>
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
