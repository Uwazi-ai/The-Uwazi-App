import { useState, useEffect } from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const pillars = [
  { title: "Technology", desc: "AI-powered civic tools and platforms" },
  { title: "Research", desc: "Community-centered civic intelligence" },
  { title: "Consulting", desc: "Strategic civic advisory services" },
];

const timeline = [
  { year: "2024", label: "Foundation Year", desc: "Establishing full-service civic intelligence infrastructure with platforms, research, and consulting services" },
  { year: "2025", label: "Scale & Expansion", desc: "Expanding civic intelligence tools across more communities and deepening research capabilities" },
  { year: "2027", label: "Integration & Innovation", desc: "Launching advanced AI features and integrated civic intelligence solutions for complex public challenges" },
  { year: "2028", label: "National Impact", desc: "Building the leading civic intelligence infrastructure powering democratic participation nationwide" },
];

const sectors: Record<string, string> = {
  Elections: "UWAZI approaches elections as both a data system and a trust system. We analyze voting data, turnout trends, polling insights, and civic sentiment to understand not just who participates, but where participation breaks down and why. Our work examines election administration policy, ballot measures, and legislative frameworks that shape access and engagement. We support voter outreach strategy, civic education, and policy communications that scale from local elections to statewide and federal cycles, while remaining grounded in community realities.",
  "Public Health": "We examine public health through the lens of civic intelligence — connecting health outcomes to policy decisions, community infrastructure, and social determinants that shape wellbeing across communities.",
  Housing: "Our housing work focuses on affordability data, displacement patterns, and policy interventions that support equitable development and community stability.",
  "Public Safety": "We analyze public safety through community-centered data, examining how policy, resources, and trust intersect to shape safety outcomes across neighborhoods.",
  Workforce: "We study workforce development through civic data — connecting employment trends, skills gaps, and policy decisions to community economic outcomes.",
};

const values = [
  "Non-partisan by design",
  "Ethical + accountable AI",
  "Community-first data",
  "Local roots, scalable impact",
];

export default function AboutPage() {
  const [activeSector, setActiveSector] = useState("Elections");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MarketingNav />
      <main>
        {/* HERO */}
        <section className="pt-32 pb-20 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-4">About</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Building Civic Intelligence Infrastructure</h1>
            <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto">
              Turning civic complexity into clarity through community data, AI platforms, and trusted advisory services
            </p>
          </div>
        </section>

        {/* PILLARS */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">What UWAZI Is</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-12">Three Pillars of Civic Intelligence</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {pillars.map((p) => (
                <div key={p.title} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
                  <h3 className="text-xl font-semibold mb-3">{p.title}</h3>
                  <p className="text-white/60">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TIMELINE */}
        <section className="py-20 px-6 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">Our Evolution</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-12">The Next Four Years of Civic Intelligence</h2>
            <div className="grid md:grid-cols-4 gap-6">
              {timeline.map((t, i) => (
                <div key={t.year} className="relative">
                  {i < timeline.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-full w-full h-px bg-white/10 z-0" />
                  )}
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-full bg-[#9bd34b]/20 border border-[#9bd34b]/40 flex items-center justify-center text-[#9bd34b] font-bold text-sm mb-4">
                      {t.year}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t.label}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INDUSTRIES */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">Industries We Serve</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-8">Civic Intelligence Across Five Sectors</h2>
            <div className="flex flex-wrap gap-3 mb-8">
              {Object.keys(sectors).map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSector(s)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    activeSector === s
                      ? "bg-[#9bd34b] text-black"
                      : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
              <p className="text-white/70 leading-relaxed">{sectors[activeSector]}</p>
            </div>
          </div>
        </section>

        {/* MISSION + VISION */}
        <section className="py-20 px-6 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
                <h3 className="text-[#9bd34b] text-sm font-semibold uppercase tracking-wider mb-4">Mission</h3>
                <p className="text-white/70 leading-relaxed">
                  To turn civic complexity into clarity through community data, AI platforms, and trusted advisory services that strengthen democratic participation and public outcomes
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
                <h3 className="text-[#9bd34b] text-sm font-semibold uppercase tracking-wider mb-4">Vision</h3>
                <p className="text-white/70 leading-relaxed">
                  A civic infrastructure where information is clear, data serves communities, and intelligence powers better public decisions for everyone
                </p>
              </div>
            </div>
            <div className="text-center">
              <span className="inline-block px-4 py-2 rounded-full bg-[#9bd34b]/10 border border-[#9bd34b]/30 text-[#9bd34b] text-sm font-medium">
                Non-partisan by design
              </span>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">Our Principles</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-12">Values That Guide Everything We Build</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((v) => (
                <div key={v} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-center">
                  <p className="text-lg font-semibold">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section className="py-20 px-6 bg-white/[0.02]">
          <div className="max-w-4xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-8">Team</p>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 md:p-12 mb-8">
              <h3 className="text-2xl font-bold mb-1">Mychal Shaw</h3>
              <p className="text-[#9bd34b] text-sm font-medium mb-4">Founder & CEO</p>
              <p className="text-white/60 leading-relaxed">
                Mychal Shaw is the Founder and CEO of UWAZI.AI, a civic intelligence company building AI-powered tools, research, and advisory services to strengthen democratic participation. With a background spanning civic technology, strategic marketing, and community engagement, Mychal's work sits at the intersection of data, culture, and public life. He is a self-taught technologist who built UWAZI's early AI systems from the ground up, driven by a belief that civic information should be clear, accessible, and rooted in trust.
              </p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
              <h3 className="text-xl font-bold mb-2">Advisory & Ethics Board — Coming Soon</h3>
              <p className="text-white/60 mb-6">
                We're building an advisory board of civic leaders, technologists, ethicists, and community organizers.
              </p>
              <ul className="space-y-2 text-white/50 text-sm">
                <li>· Civic technology experts</li>
                <li>· AI ethics and accountability specialists</li>
                <li>· Community organizing leaders</li>
                <li>· Public policy and governance advisors</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Partner With Us to Build Better Civic Infrastructure</h2>
            <p className="text-white/60 text-lg mb-10">
              Bring civic intelligence to your community or organization through our platforms, research, or advisory services
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/contact" className="px-8 py-3 bg-[#9bd34b] text-black font-semibold rounded-full hover:bg-[#9bd34b]/90 transition-colors">
                Partner With Us
              </a>
              <a href="/products" className="px-8 py-3 border border-white/20 text-white font-semibold rounded-full hover:border-white/40 transition-colors">
                Explore Products
              </a>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
