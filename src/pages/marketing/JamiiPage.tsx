import { useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { Check } from "lucide-react";

const useCases = [
  { title: "City Governments", desc: "Monitor community civic health by zip code. Identify where engagement is lowest and target outreach with precision." },
  { title: "Nonprofits & Foundations", desc: "Prove civic impact to funders with data. Track program outcomes and measure community engagement over time." },
  { title: "Advocacy Organizations", desc: "Understand community sentiment on your issues. Design campaigns that resonate with real data." },
];

const raiaStats = ["0–100 Scale", "Zip Code Level", "Real-Time Data", "Nonpartisan"];

const checkmarks = [
  "Community civic health scoring",
  "Voter engagement analytics",
  "Policy impact tracking",
  "Custom research dashboards",
];

const TEAL = "text-teal-400";
const TEAL_BG = "bg-teal-400";
const TEAL_BORDER = "border-teal-400";

export default function JamiiPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>
        {/* HERO */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className={`text-xs uppercase tracking-[0.2em] ${TEAL} mb-4`}>JAMII INTELLIGENCE</p>
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6">Civic Intelligence for Organizations</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
              Community-level civic analytics for nonprofits, city governments, and public institutions. Understand your community's civic health at scale.
            </p>
            <p className={`text-sm ${TEAL} mb-8`}>Named after the Swahili word for 'community'</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact" className={`px-6 py-3 ${TEAL_BG} text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity`}>Request a Demo</Link>
              <a href="#what-is-jamii" className="px-6 py-3 border border-border rounded-full font-medium hover:border-teal-400/50 transition-colors">Learn More</a>
            </div>
          </div>
        </section>

        {/* WHAT IS JAMII */}
        <section id="what-is-jamii" className="py-20 px-6 border-y border-border">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-4">From community data to civic action</h2>
              <p className="text-muted-foreground mb-8">Jamii Intelligence gives organizations a real-time window into the civic health of their community. Track voter engagement, sentiment, policy awareness, and participation — all in one dashboard built for decision-makers.</p>
              <div className="space-y-4">
                {checkmarks.map((c) => (
                  <div key={c} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-teal-400" />
                    </div>
                    <p className="text-sm">{c}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl aspect-video flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Jamii Dashboard</p>
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-12 text-center">Built for civic organizations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {useCases.map((u) => (
                <div key={u.title} className="bg-card border border-border rounded-2xl p-6 hover:border-teal-400/30 transition-colors">
                  <h3 className="font-medium mb-2">{u.title}</h3>
                  <p className="text-sm text-muted-foreground">{u.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RAIA SCORE */}
        <section className="py-20 px-6 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <p className={`text-xs uppercase tracking-[0.2em] ${TEAL} mb-4`}>POWERED BY THE RAIA SCORE</p>
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-4">The world's first zip-code-level civic health index</h2>
            <p className="text-muted-foreground mb-10 max-w-2xl mx-auto">
              The Raia Score (0–100) aggregates real-time data on voter turnout, ballot comprehension, policy awareness, and community trust — then correlates that with housing stability, food access, and preventive care outcomes. Powered by RAG 1.0, our civic AI model.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {raiaStats.map((s) => (
                <div key={s} className={`bg-card border ${TEAL_BORDER}/20 rounded-xl p-4`}>
                  <p className={`font-medium text-sm ${TEAL}`}>{s}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-4">See Jamii in action</h2>
            <p className="text-muted-foreground mb-8">Book a demo to see how Jamii Intelligence can power your organization's civic strategy.</p>
            <Link to="/contact" className={`inline-block px-8 py-3 ${TEAL_BG} text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity`}>Book a Demo</Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
