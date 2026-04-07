import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Car, Bell, CheckCircle, Vote, ChevronRight, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const electionDate = new Date("2026-11-03");
const getDaysUntil = () => Math.max(0, Math.ceil((electionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

const sampleRaces = [
  {
    title: "Mayor",
    candidates: [
      { name: "Sarah Johnson", party: "Democratic" },
      { name: "Marcus Williams", party: "Republican" },
    ],
  },
  {
    title: "City Council District 5",
    candidates: [
      { name: "Alex Rivera", party: "Independent" },
      { name: "Kim Chen", party: "Democratic" },
    ],
  },
];

const localElections = [
  { name: "2026 General Election", date: "Nov 3, 2026", jurisdiction: "Federal / State / Local" },
  { name: "School Board Special Election", date: "Sep 15, 2026", jurisdiction: "Local" },
  { name: "Primary Election", date: "Aug 4, 2026", jurisdiction: "State" },
];

export default function VotingHubPage() {
  const daysLeft = getDaysUntil();
  const { zipCode } = useCivicLocation();
  const [planStep, setPlanStep] = useState(0);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});

  const handleSavePlan = () => {
    toast.success("+25 XP — Voter Ready badge earned! 🎓");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-2">YOUR CIVIC ACTION CENTER</p>
        <h1 className="font-heading text-5xl md:text-6xl text-foreground leading-none">YOUR VOTE. YOUR POWER.</h1>
        {zipCode && (
          <div className="flex items-center gap-2 mt-3">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Showing local races for <span className="text-primary font-semibold">{zipCode}</span></span>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voting Plan Builder */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-card p-6 border border-border"
        >
          <h2 className="font-heading text-2xl text-foreground mb-5">VOTING PLAN BUILDER</h2>
          <div className="space-y-4">
            {[
              { num: "01", label: "Election date", sub: "Nov 3, 2026" },
              { num: "02", label: "Polling location", sub: "Find yours" },
              { num: "03", label: "How are you getting there?", sub: "Drive / Walk / Transit" },
              { num: "04", label: "Set a reminder", sub: "Election day alert" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-card bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {step.num}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={handleSavePlan} className="w-full mt-6 bg-primary text-primary-foreground">Save My Plan</Button>
        </motion.div>

        {/* Ballot Simulator */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-card p-6 border border-border"
        >
          <h2 className="font-heading text-2xl text-foreground mb-5">YOUR BALLOT</h2>
          <div className="space-y-5">
            {sampleRaces.map((race) => (
              <div key={race.title}>
                <p className="text-sm font-bold text-foreground mb-2">{race.title}</p>
                <div className="space-y-2">
                  {race.candidates.map((c) => (
                    <button key={c.name} onClick={() => setSelectedCandidates((p) => ({ ...p, [race.title]: c.name }))}
                      className={`w-full text-left px-4 py-3 rounded-card border transition-all text-sm ${
                        selectedCandidates[race.title] === c.name
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:border-primary/30 text-foreground"
                      }`}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{c.party}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-6 border-primary text-primary">Review My Ballot</Button>
        </motion.div>

        {/* Local Races */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-card p-6 border border-border"
        >
          <h2 className="font-heading text-2xl text-foreground mb-5">LOCAL RACES</h2>
          <div className="space-y-3">
            {localElections.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.date} · {e.jurisdiction}</p>
                </div>
                <span className="text-xs text-primary font-medium cursor-pointer hover:underline">Learn More →</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
