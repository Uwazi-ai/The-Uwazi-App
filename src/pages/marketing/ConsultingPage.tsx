import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const services = [
  { title: "Policy and Legislative Strategy", desc: "Providing strategic counsel on policy and legislative initiatives" },
  { title: "Equity-Centered Policy Communications", desc: "Crafting communications that amplify equity and access" },
  { title: "Community Outreach and Engagement Design", desc: "Developing targeted outreach and engagement strategies" },
  { title: "Gen-Z Engagement and Outreach Strategy", desc: "Designing strategies to authentically reach younger audiences" },
  { title: "Cross-Sector Partnership Development", desc: "Fostering collaborative relationships for greater impact" },
  { title: "Community Research and Data Actualization", desc: "Translating data into actionable, community-informed insights" },
];

const philosophy = [
  { num: "01", title: "Making Complex Systems Understandable", desc: "Translating policy, legislation, and institutional processes into clear, accessible language" },
  { num: "02", title: "Centering Lived Experience Alongside Data", desc: "Incorporating community voice, cultural context, and real-world impact into decision-making" },
  { num: "03", title: "Building Trust Before Asking for Action", desc: "Prioritizing transparency, accountability, and responsiveness in interactions" },
  { num: "04", title: "Designing Engagement That Feels Human, Not Institutional", desc: "Creating participation pathways that respect attention, time, and culture" },
];

const equityPoints = [
  { title: "Understanding Historical and Structural Barriers", desc: "Acknowledging the historical context and systemic factors that create barriers to equitable civic engagement." },
  { title: "Acknowledging Trauma and Mistrust in Civic Systems", desc: "Recognizing the impact of past harms and lack of trust in institutions, and designing strategies to address these." },
  { title: "Designing Strategies That Reduce Harm, Not Just Increase Participation", desc: "Prioritizing harm reduction and mitigation over focusing solely on increasing participation numbers." },
  { title: "Aligning Policy, Communications, and Community Voice", desc: "Ensuring that policy decisions, public messaging, and community input are all aligned to support equitable outcomes." },
];

const civicEngagement = [
  "Respects Attention, Time, and Culture",
  "Builds Confidence, Not Confusion",
  "Challenges Traditional Assumptions",
  "Meets People Where They Are",
  "Uses Clear, Accessible Language",
];

const genZBullets = [
  "Gen-Z is not disengaged",
  "Gen-Z responds to transparency",
  "Gen-Z responds to values",
  "Gen-Z responds to participation over just observation",
  "Gen-Z responds to native platforms and formats",
];

const genZApproach = [
  "Design Actionable Participation Pathways",
  "Leverage Digital-First, Community-Driven Channels",
  "Translate Policy Into Plain Language",
  "Connect Issues to Lived Impact",
  "Use Storytelling Over Jargon",
];

const differentiators = [
  "Systems Thinking + Cultural Fluency",
  "Policy Literacy + Modern Storytelling",
  "Strategy Designed for Today and Tomorrow",
  "Equity Without Abstraction",
];

export default function ConsultingPage() {
  useEffect(() => {
    document.title = "UWAZI Consulting — Civic Strategy & Intelligence";
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MarketingNav />
      <main>
        {/* SECTION 1 — HERO */}
        <section className="pt-28 pb-20 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-5">
                UWAZI CONSULTING
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.1] mb-5">
                BRIDGING THE GAP BETWEEN POLICY, SYSTEMS, AND PEOPLE.
              </h1>
              <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-lg">
                UWAZI Consulting helps organizations bridge the gap between policy, systems, and people.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-lime-500 text-black font-semibold text-sm rounded-full hover:bg-lime-400 transition-colors"
                >
                  Book a Consult <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#services"
                  className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/20 text-white font-semibold text-sm rounded-full hover:border-white/40 transition-colors"
                >
                  View Services
                </a>
              </div>
            </div>
            <div className="aspect-video rounded-2xl border border-white/[0.08] bg-[#111] overflow-hidden relative">
              {/* Civic network pattern */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 400" fill="none">
                <circle cx="150" cy="100" r="4" fill="#84cc16" opacity="0.6" />
                <circle cx="300" cy="80" r="3" fill="#84cc16" opacity="0.4" />
                <circle cx="450" cy="150" r="5" fill="#84cc16" opacity="0.5" />
                <circle cx="200" cy="250" r="3" fill="#84cc16" opacity="0.3" />
                <circle cx="350" cy="200" r="4" fill="#84cc16" opacity="0.6" />
                <circle cx="500" cy="280" r="3" fill="#84cc16" opacity="0.4" />
                <circle cx="100" cy="300" r="4" fill="#84cc16" opacity="0.5" />
                <circle cx="400" cy="320" r="3" fill="#84cc16" opacity="0.3" />
                <circle cx="250" cy="350" r="4" fill="#84cc16" opacity="0.4" />
                <circle cx="520" cy="100" r="3" fill="#84cc16" opacity="0.5" />
                <line x1="150" y1="100" x2="300" y2="80" stroke="#84cc16" strokeWidth="0.5" opacity="0.2" />
                <line x1="300" y1="80" x2="450" y2="150" stroke="#84cc16" strokeWidth="0.5" opacity="0.2" />
                <line x1="150" y1="100" x2="200" y2="250" stroke="#84cc16" strokeWidth="0.5" opacity="0.15" />
                <line x1="200" y1="250" x2="350" y2="200" stroke="#84cc16" strokeWidth="0.5" opacity="0.2" />
                <line x1="350" y1="200" x2="500" y2="280" stroke="#84cc16" strokeWidth="0.5" opacity="0.15" />
                <line x1="450" y1="150" x2="350" y2="200" stroke="#84cc16" strokeWidth="0.5" opacity="0.2" />
                <line x1="100" y1="300" x2="200" y2="250" stroke="#84cc16" strokeWidth="0.5" opacity="0.15" />
                <line x1="100" y1="300" x2="250" y2="350" stroke="#84cc16" strokeWidth="0.5" opacity="0.2" />
                <line x1="400" y1="320" x2="500" y2="280" stroke="#84cc16" strokeWidth="0.5" opacity="0.15" />
                <line x1="250" y1="350" x2="400" y2="320" stroke="#84cc16" strokeWidth="0.5" opacity="0.2" />
                <line x1="450" y1="150" x2="520" y2="100" stroke="#84cc16" strokeWidth="0.5" opacity="0.15" />
                <line x1="300" y1="80" x2="520" y2="100" stroke="#84cc16" strokeWidth="0.5" opacity="0.1" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-br from-lime-500/[0.03] to-transparent" />
            </div>
          </div>
        </section>

        {/* SECTION 2 — WHO WE ARE */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-5">
              WHO ARE WE
            </span>
            <p className="text-white/50 text-base leading-relaxed">
              UWAZI Consulting is a civic strategy and intelligence partner that helps organizations bridge the gap between policy, systems, and people. Their work prioritizes clarity, trust, and impact.
            </p>
          </div>
        </section>

        {/* SECTION 3 — SERVICES */}
        <section id="services" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-3">
              SERVICES
            </span>
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-10">OUR SERVICES</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {services.map((svc) => (
                <div
                  key={svc.title}
                  className="rounded-2xl p-6 bg-[#111] border border-white/[0.08] hover:border-lime-500/30 hover:shadow-[0_0_30px_-10px_rgba(155,211,75,0.15)] transition-all duration-300"
                >
                  <h3 className="font-heading text-lg text-white mb-2">{svc.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{svc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4 — CORE PHILOSOPHY */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-3">
              OUR CORE PHILOSOPHY
            </span>
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-10">
              MAKING COMPLEX SYSTEMS UNDERSTANDABLE
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              {philosophy.map((item) => (
                <div key={item.num} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-xs font-bold text-lime-500 shrink-0">
                    {item.num}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-3xl">
              UWAZI's core philosophy centers on making complex systems understandable, elevating lived experience alongside data, designing human-centered engagement, and building trust.
            </p>
          </div>
        </section>

        {/* SECTION 5 — EQUITY-CENTERED */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl p-8 md:p-12 bg-[#111] border border-white/[0.08]">
              <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-6">
                EQUITY-CENTERED, SYSTEMS-LED
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {equityPoints.map((pt) => (
                  <div key={pt.title}>
                    <h3 className="text-sm font-bold text-white mb-2">{pt.title}</h3>
                    <p className="text-xs text-white/40 leading-relaxed">{pt.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-lime-500/80 font-medium">
                Equity is the foundation of UWAZI's approach to every engagement.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6 — CIVIC ENGAGEMENT APPROACH */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-3">
              HOW WE THINK ABOUT CIVIC ENGAGEMENT
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
              {civicEngagement.map((item) => (
                <div
                  key={item}
                  className="rounded-xl p-5 bg-[#111] border border-white/[0.08] text-center"
                >
                  <p className="text-sm font-semibold text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 7 — GEN-Z FOCUS */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl p-8 md:p-12 bg-[#111] border border-white/[0.08]">
              <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-3">
                GEN-Z FOCUS
              </span>
              <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-8">WHY GEN-Z MATTERS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <div className="space-y-3 mb-6">
                    {genZBullets.map((b) => (
                      <div key={b} className="flex items-start gap-3">
                        <Check className="h-4 w-4 text-lime-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-white/60">{b}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-white/30 italic leading-relaxed border-l-2 border-white/10 pl-4">
                    They are disengaged from systems that feel outdated, opaque, or performative.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-4">Our Gen-Z Engagement Approach</h3>
                  <div className="space-y-3">
                    {genZApproach.map((a, i) => (
                      <div key={a} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-md bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-[10px] font-bold text-lime-500 shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm text-white/60">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8 — LEGISLATIVE FOCUS */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-3">
              LEGISLATIVE FOCUS
            </span>
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-8">
              LEGISLATIVE SUPPORT: DATA-LED, HUMAN-INFLUENCED
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="rounded-2xl p-6 bg-[#111] border border-white/[0.08]">
                <h3 className="text-sm font-bold text-lime-500 mb-2">Data-led</h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Grounded in research, policy analysis, and measurable outcomes
                </p>
              </div>
              <div className="rounded-2xl p-6 bg-[#111] border border-white/[0.08]">
                <h3 className="text-sm font-bold text-lime-500 mb-2">Human-influenced</h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Informed by community voice, cultural context, and real-world impact
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Translating legislation into clear, accessible language",
                "Identifying equity implications and unintended consequences",
                "Aligning policy narratives with community needs and values",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-lime-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-white/50">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 9 — WHAT MAKES UWAZI DIFFERENT */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-3">
              WHAT MAKES UWAZI DIFFERENT
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8 mb-8">
              {differentiators.map((d) => (
                <div
                  key={d}
                  className="rounded-2xl p-6 bg-[#111] border border-white/[0.08] border-l-4 border-l-lime-500"
                >
                  <h3 className="font-heading text-lg text-white">{d}</h3>
                </div>
              ))}
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-3xl">
              UWAZI combines a unique blend of capabilities to deliver strategies that are truly transformative.
            </p>
          </div>
        </section>

        {/* SECTION 10 — FOUNDER MESSAGE */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block text-xs uppercase tracking-[0.25em] text-lime-500 font-semibold mb-6">
              MESSAGE FROM THE FOUNDER
            </span>
            <div className="rounded-2xl p-8 md:p-10 bg-[#111] border border-white/[0.08] border-l-4 border-l-lime-500">
              <p className="text-sm text-white/60 leading-[1.8] italic mb-6">
                "Uwazi consulting exists because I have spent years working at the intersection of community, policy, and systems. I've seen firsthand how often people are left out of decisions that directly affect their lives. My passion for this work comes from listening to communities navigate complex policies, inaccessible institutions, and systems that were not designed with them in mind. I believe civic engagement and policy work should be clear, humane, and grounded in real lived experience — not jargon or gatekeeping. UWAZI Consulting was built to help organizations do this work with integrity: translating complexity into clarity, centering equity and trust, and building strategies that people can actually see themselves in."
              </p>
              <p className="text-sm font-bold text-white">Mychal Shaw</p>
              <p className="text-xs text-white/40">Founder & CEO</p>
            </div>
          </div>
        </section>

        {/* SECTION 11 — FINAL CTA */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto rounded-2xl p-10 md:p-14 bg-[#111] border border-white/[0.08] text-center">
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-4">
              BUILD SMARTER CIVIC STRATEGIES
            </h2>
            <p className="text-white/50 text-sm max-w-xl mx-auto mb-8">
              UWAZI empowers organizations to bridge the gap between policy, systems, and people — fostering clarity, trust, and long-term impact.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-lime-500 text-black font-semibold text-sm rounded-full hover:bg-lime-400 transition-colors"
              >
                Book a Consult <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/20 text-white font-semibold text-sm rounded-full hover:border-white/40 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
