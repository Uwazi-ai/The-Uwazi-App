import { Link } from "react-router-dom";
import { ShieldCheck, Vote, Link2, UserCheck, ToggleRight, Database, Flag, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const POINTS = [
  { Icon: Vote, t: "We never tell you how to vote", d: "UWAZI gives facts about offices, candidates, and the budget. The choice is always yours." },
  { Icon: Link2, t: "Every fact has a source", d: "Each fact links to an official source. It also shows the date we last checked it." },
  { Icon: UserCheck, t: "A person checks every change", d: "When a city page changes, a real person reviews it first. Nothing shows up until they say yes." },
  { Icon: ToggleRight, t: "Personalizing is your choice", d: "It stays off until you turn it on. You can turn it off any time in Your data." },
  { Icon: Database, t: "You see what we keep", d: "Your data page lists everything we store. You can download it all. You can delete your Compass data any time." },
  { Icon: Flag, t: "Tell us when something is wrong", d: "Tap Report inaccurate info next to any fact. A person looks at every report." },
];

export default function FairPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <ShieldCheck className="h-10 w-10 text-primary" />
          <h1 className="font-heading text-3xl md:text-4xl text-foreground">How UWAZI stays fair</h1>
          <p className="text-muted-foreground">These are the rules we follow every day.</p>
        </div>
        <div className="space-y-3">
          {POINTS.map(({ Icon, t, d }) => (
            <div key={t} className="rounded-2xl bg-card border border-border p-5 flex gap-3">
              <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-foreground">{t}</h2>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 space-y-3">
          <p className="font-semibold text-foreground">Want to know more?</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild><Link to={`/app/ask?q=${encodeURIComponent("How does UWAZI stay fair?")}`}><MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI</Link></Button>
            <Button asChild variant="outline"><Link to="/app/settings/data">See your data</Link></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
