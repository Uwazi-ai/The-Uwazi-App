import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { Check } from "lucide-react";

const problemStats = [
  { value: "80%", desc: "Of voters report feeling overwhelmed by complex ballots" },
  { value: "15%", desc: "Voter participation in local elections" },
  { value: "60%", desc: "Of eligible voters participate in presidential elections" },
];

const askFeatures = [
  { title: "Text Simplification", desc: "No more complex legal jargon on your ballot" },
  { title: "Accuracy Tested", desc: "Clear, verified information" },
  { title: "Candidate Research", desc: "Understand their stances" },
  { title: "Non-Partisan", desc: "Focused on facts, not party" },
];

const voteFeatures = [
  { title: "Sample Ballot", desc: "Learn your ballot before election day" },
  { title: "Election Countdown", desc: "Never miss a local election" },
  { title: "Find Your Poll", desc: "Maps with directions" },
  { title: "Poll Checklist", desc: "Everything you need before heading out" },
];

const legislationPills = ["Live Bill Monitoring", "Plain Language Summaries", "Impact Insights", "Custom Alerts", "Legislation Library"];

const featuresGrid = [
  { title: "Legislation Tracker", desc: "Find local opportunities to better your community" },
  { title: "Civic News Feed", desc: "Learn more about your community at every level" },
  { title: "Local Events", desc: "Find local events that are building your community" },
  { title: "Register to Vote", desc: "Become an eligible voter right inside the app" },
  { title: "Community & XP", desc: "Earn XP as you engage, track your civic impact" },
  { title: "Personalized Dashboard", desc: "A personal home page built to serve your community" },
];

const freePlan = [
  "10 question tokens per day",
  "Legislation Tracker",
  "Exclusive content",
  "Basic features access",
  "Beta test latest features",
  "Notifications and updates",
];

const plusPlan = [
  "Unlimited question tokens",
  "Legislation Tracker",
  "Exclusive content",
  "Access to ALL features",
  "Beta test latest features",
  "Notifications and updates",
];

export default function UwaziAppPage() {
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    document.title = "The UWAZI App — Your Civic Co-Pilot";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>
        {/* HERO */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">THE UWAZI APP</p>
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6">Your Civic Co-Pilot</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Ask Uwazi any civic question, track legislation, prepare for elections, and grow your civic literacy — all in one place. Free for every voter.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <a href="https://uwaziapp.uwazi.ai" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors">
                Try the App Free →
              </a>
              <a href="#features" className="px-6 py-3 border border-border rounded-full font-medium hover:border-primary/50 transition-colors">
                See Features
              </a>
            </div>
            <p className="text-sm text-muted-foreground">Non-partisan · Built for clarity · Privacy-first</p>
          </div>
        </section>

        {/* PROBLEM STATS */}
        <section className="py-20 px-6 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-10 text-center">Why UWAZI Exists</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {problemStats.map((s) => (
                <div key={s.value} className="bg-card border border-border rounded-2xl p-8 text-center">
                  <p className="font-heading text-4xl md:text-5xl text-primary mb-3">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ASK UWAZI */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">AI TOOL</p>
              <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-4">Ask Uwazi</h2>
              <p className="text-muted-foreground mb-8">Unlock your civic freedom. Ask Uwazi what you need to know about your next election.</p>
              <div className="space-y-5">
                {askFeatures.map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{f.title}</p>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl aspect-[3/4] flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Ask Uwazi Interface</p>
            </div>
          </div>
        </section>

        {/* VOTE YOUR WAY */}
        <section className="py-20 px-6 border-y border-border">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="bg-card border border-border rounded-2xl aspect-[3/4] flex items-center justify-center order-2 lg:order-1">
              <p className="text-muted-foreground text-sm">Ballot Simulator</p>
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">VOTE YOUR WAY</p>
              <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-4">Everything you need at the polls</h2>
              <div className="space-y-5">
                {voteFeatures.map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{f.title}</p>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* LEGISLATION TRACKER */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">TRACK LEGISLATION</p>
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-4">Stay informed on the policies that affect your life</h2>
            <p className="text-muted-foreground mb-10 max-w-2xl mx-auto">Real-time tracking of local, state, and federal legislation. Simplified and personalized for you.</p>
            <div className="flex flex-wrap justify-center gap-3">
              {legislationPills.map((p) => (
                <span key={p} className="px-4 py-2 bg-card border border-border rounded-full text-sm">{p}</span>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-20 px-6 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4 text-center">DISCOVER UWAZI FEATURES</p>
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-12 text-center">Everything you need to engage civically</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuresGrid.map((f) => (
                <div key={f.title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
                  <h3 className="font-medium mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4 text-center">OUR PRICING</p>
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-8 text-center">Flexible plans for every voter</h2>
            <div className="flex justify-center mb-10">
              <div className="bg-card border border-border rounded-full p-1 flex">
                <button onClick={() => setYearly(false)} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${!yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Monthly</button>
                <button onClick={() => setYearly(true)} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Yearly</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free */}
              <div className="bg-card border border-border rounded-2xl p-8">
                <h3 className="font-heading text-xl mb-1">Free</h3>
                <p className="font-heading text-3xl mb-2">$0<span className="text-base text-muted-foreground font-normal">/month</span></p>
                <p className="text-sm text-muted-foreground mb-6">Basic access with essential features</p>
                <ul className="space-y-3 mb-8">
                  {freePlan.map((i) => (
                    <li key={i} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary flex-shrink-0" />{i}</li>
                  ))}
                </ul>
                <a href="https://uwaziapp.uwazi.ai" target="_blank" rel="noopener noreferrer" className="block text-center px-6 py-3 border border-border rounded-full font-medium hover:border-primary/50 transition-colors">Get Started Free</a>
              </div>
              {/* UWAZI+ */}
              <div className="bg-card border-2 border-primary rounded-2xl p-8 relative">
                <h3 className="font-heading text-xl mb-1">UWAZI+</h3>
                <p className="font-heading text-3xl mb-2">${yearly ? "199.99" : "19.99"}<span className="text-base text-muted-foreground font-normal">/{yearly ? "year" : "month"}</span></p>
                <p className="text-sm text-muted-foreground mb-6">Enhanced features for a full civic experience</p>
                <ul className="space-y-3 mb-8">
                  {plusPlan.map((i) => (
                    <li key={i} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary flex-shrink-0" />{i}</li>
                  ))}
                </ul>
                <a href="https://uwaziapp.uwazi.ai" target="_blank" rel="noopener noreferrer" className="block text-center px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors">Get UWAZI+</a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 border-t border-border">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-6">Ready to show up informed?</h2>
            <a href="https://uwaziapp.uwazi.ai" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors mb-4">
              Open the App Free →
            </a>
            <p className="text-sm text-muted-foreground">Non-partisan. Built for clarity. Privacy-first.</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
