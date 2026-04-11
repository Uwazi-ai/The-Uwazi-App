import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const services = [
  {
    title: "Community Sentiment & Civic Intelligence Analysis",
    desc: "Understanding public feedback and narratives. Translating community needs into actionable insight.",
  },
  {
    title: "Strategic Community Engagement Design",
    desc: "Building trust through modern outreach strategies that actually reach the communities you serve.",
  },
  {
    title: "Community Research & Data Actualization",
    desc: "Quantifying program and policy effectiveness with neighborhood-level civic data.",
  },
  {
    title: "Civic Impact Measurement & Reporting",
    desc: "Analyzing the real-world impact of policies. Clear, fundable reports that prove outcomes.",
  },
  {
    title: "Policy & Legislative Intelligence",
    desc: "Tracking, analyzing, and translating policy changes into plain language your team and community can act on.",
  },
  {
    title: "Strategic Communications Intelligence",
    desc: "Analyzing messaging, narratives, and public perception to sharpen how your organization communicates.",
  },
];

const engagementModels = [
  {
    title: "Insight Snapshot",
    desc: "Concise analysis reports for specific issues. Fast turnaround.",
    best: "quick decisions",
  },
  {
    title: "Strategic Research Projects",
    desc: "In-depth research and policy intelligence for complex challenges.",
    best: "grant cycles",
  },
  {
    title: "Ongoing Advisory",
    desc: "Continuous monthly consulting support with dedicated access to our team.",
    best: "long-term partners",
  },
  {
    title: "Civic Intelligence Dashboards",
    desc: "Recurring data analysis and reporting delivered on your schedule.",
    best: "city governments",
  },
];

const clientTypes = [
  "City Governments",
  "Public Agencies",
  "Nonprofits",
  "Foundations",
  "Advocacy Organizations",
];

export default function ConsultingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MarketingNav />
      <main>
        {/* SECTION 1 — HERO */}
        <section className="pt-32 pb-20 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-5">
              UWAZI CONSULTING
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.08] mb-6">
              CIVIC INTELLIGENCE FOR MODERN GOVERNANCE
            </h1>
            <p className="text-white/50 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
              We partner with governments, nonprofits, and civic organizations to turn community data, policy intelligence, and civic insight into meaningful action.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-lime-500 text-black font-semibold text-sm rounded-full hover:bg-lime-400 transition-colors"
              >
                Start a Conversation <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#services"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/20 text-white font-semibold text-sm rounded-full hover:border-white/40 transition-colors"
              >
                View Services
              </a>
            </div>
            <p className="text-xs text-white/30 tracking-wide">
              Serving city governments · nonprofits · foundations · advocacy organizations
            </p>
          </div>
        </section>

        {/* SECTION 2 — THE CHALLENGE */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-6">THE CHALLENGE</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Public institutions and community organizations often struggle to translate community feedback, civic data, and policy information into actionable insight. UWAZI Consulting bridges this gap by combining civic research, AI-assisted analysis, and policy intelligence to help organizations make better decisions and design stronger engagement strategies.
              </p>
            </div>
            <div className="rounded-2xl p-6 md:p-8 bg-[#111] border border-white/[0.08] border-l-4 border-l-lime-500">
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                Public institutions struggle to turn community feedback into action. We fix that.
              </p>
              <div className="space-y-3">
                {[
                  "AI-assisted civic analysis at scale",
                  "Research-backed policy intelligence",
                  "Community-first engagement strategies",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-lime-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-white/60">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 — FLAGSHIP SERVICE */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl p-8 md:p-12 bg-[#111] border border-white/[0.08] border-l-4 border-l-lime-500">
              <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-lime-500 bg-lime-500/10 border border-lime-500/20 rounded-full mb-5">
                Flagship Service
              </span>
              <h2 className="font-heading text-2xl md:text-3xl tracking-tight mb-3">
                COMMUNITY SENTIMENT & CIVIC INTELLIGENCE ANALYSIS
              </h2>
              <p className="text-white/50 text-sm mb-10 max-w-2xl">
                Understanding public sentiment, detecting concerns, and identifying engagement opportunities.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    title: "Community Feedback Analysis",
                    desc: "Analyzes community feedback, stakeholder conversations, surveys, public meetings, and media narratives.",
                  },
                  {
                    title: "AI-Assisted Analysis",
                    desc: "Leverages AI-assisted analysis and civic intelligence frameworks for deep insights at the neighborhood level.",
                  },
                  {
                    title: "Actionable Intelligence",
                    desc: "Translates raw data into clear recommendations that drive better policy decisions and program design.",
                  },
                ].map((col) => (
                  <div key={col.title}>
                    <h3 className="text-sm font-bold text-white mb-2">{col.title}</h3>
                    <p className="text-xs text-white/40 leading-relaxed">{col.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4 — ALL SERVICES */}
        <section id="services" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-3">
                COMPREHENSIVE CONSULTING SERVICES
              </h2>
              <p className="text-white/50 text-sm max-w-xl mx-auto">
                A full spectrum of services designed to enhance organizational decision-making and community impact.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {services.map((svc) => (
                <div
                  key={svc.title}
                  className="rounded-2xl p-6 bg-[#111] border border-white/[0.08] hover:border-lime-500/30 hover:shadow-[0_0_30px_-10px_rgba(155,211,75,0.15)] transition-all duration-300"
                >
                  <h3 className="font-heading text-lg text-white mb-2">{svc.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed mb-4">{svc.desc}</p>
                  <span className="text-xs font-semibold text-lime-500 hover:underline cursor-pointer inline-flex items-center gap-1">
                    Learn More <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 5 — ENGAGEMENT MODELS */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-3">
                HOW WE WORK WITH YOU
              </h2>
              <p className="text-white/50 text-sm max-w-xl mx-auto">
                Services adaptable to your organization's needs and budget.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {engagementModels.map((model) => (
                <div
                  key={model.title}
                  className="rounded-2xl p-6 bg-[#111] border border-white/[0.08] hover:border-lime-500/20 transition-all"
                >
                  <h3 className="font-heading text-base text-white mb-2">{model.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed mb-4">{model.desc}</p>
                  <span className="inline-block px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-lime-500 bg-lime-500/10 border border-lime-500/20 rounded-full">
                    Best for: {model.best}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 6 — WHO WE SERVE */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-3">
              OUR TYPICAL CLIENTS
            </h2>
            <p className="text-white/50 text-sm mb-10">
              Partnering with public sector and civic organizations.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {clientTypes.map((type) => (
                <span
                  key={type}
                  className="px-4 py-2 text-xs font-medium text-white/60 bg-white/[0.05] border border-white/[0.08] rounded-full"
                >
                  {type}
                </span>
              ))}
            </div>
            <div className="max-w-3xl mx-auto rounded-2xl p-8 bg-lime-500/[0.06] border border-lime-500/20">
              <p className="text-sm text-white/70 leading-relaxed italic">
                "Whether you're a city trying to understand your residents, a nonprofit proving impact to funders, or an advocacy org sharpening your message — UWAZI gives you the intelligence to act with confidence."
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 7 — CTA BANNER */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto rounded-2xl p-10 md:p-14 bg-[#111] border border-white/[0.08] text-center">
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-4">
              BUILD SMARTER CIVIC STRATEGIES
            </h2>
            <p className="text-white/50 text-sm max-w-xl mx-auto mb-8">
              Partner with UWAZI Consulting to turn civic data, community insight, and policy intelligence into meaningful action.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-lime-500 text-black font-semibold text-sm rounded-full hover:bg-lime-400 transition-colors"
            >
              Start a Conversation <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-white/30 mt-5">
              Typical engagements begin within 2 weeks of first contact
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
