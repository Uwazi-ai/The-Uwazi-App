import { useEffect } from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const whatWeDo = [
  { title: "Community Research Initiatives", desc: "Conduct research that centers community voices and needs. We partner with community organizations to design research that serves public interest and informs better policy outcomes." },
  { title: "Civic Data Accessibility", desc: "Build infrastructure and tools that make civic data more accessible to communities, researchers, and civic organizations. We believe civic data should serve the public, not gatekeepers." },
  { title: "University, Nonprofit & City Partnerships", desc: "Collaborate with academic institutions, civic organizations, and local governments to expand civic intelligence research, data sharing, and technology access." },
];

const researchAreas = [
  { title: "Elections & Democratic Participation", desc: "Research on voter engagement, civic literacy, and democratic participation to inform better election systems and civic education." },
  { title: "Health Equity & Social Determinants", desc: "Community health research focused on equity, access, and the social factors that shape public health outcomes." },
  { title: "Housing Affordability & Policy", desc: "Research on housing data, displacement, and policy interventions to support equitable development and affordability." },
  { title: "AI Ethics & Public Systems", desc: "Research on ethical AI deployment in public systems, algorithmic accountability, and community data governance." },
];

const partnerships = [
  { title: "Academic Partnerships", desc: "Collaborate on research projects, data access, and student opportunities. Partner on research projects, provide students with civic intelligence internships, and access civic data for academic study." },
  { title: "Nonprofit & Community Organizations", desc: "Co-design research that serves community needs and advocacy goals. Conduct community-centered research, access civic data, and build capacity for data-driven advocacy." },
  { title: "Public Sector", desc: "Collaborate on civic data infrastructure and research for public benefit. Partner with cities and government agencies to improve civic data accessibility and develop civic intelligence tools." },
];

const coLabBullets = [
  "Community-driven data collection and surveys",
  "Participatory research and listening sessions",
  "Cross-sector collaboration between residents and institutions",
  "Policy modeling and scenario testing",
  "Open, non-partisan insights that inform local, state, and federal decision-making",
];

export default function RaiaInstitutePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MarketingNav />
      <main>
        {/* HERO */}
        <section className="pt-32 pb-20 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">The Raia Institute</h1>
            <p className="text-white/60 text-lg md:text-xl max-w-3xl mx-auto mb-4">
              The Raia Institute is UWAZI's research and civic data access initiative. We focus on making civic intelligence accessible to communities, researchers, and public institutions through open research, partnerships, and data infrastructure for public benefit.
            </p>
            <p className="text-white/40 text-sm italic">Named after the Swahili word for 'citizen'</p>
          </div>
        </section>

        {/* WHAT WE DO */}
        <section className="py-20 px-6 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">What We Do</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-12">Building civic intelligence infrastructure for public benefit</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {whatWeDo.map((c) => (
                <div key={c.title} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
                  <h3 className="text-xl font-semibold mb-3">{c.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RESEARCH FOCUS */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">Research Focus Areas</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-12">Civic intelligence research across critical public sectors</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {researchAreas.map((r) => (
                <div key={r.title} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
                  <h3 className="text-lg font-semibold mb-3">{r.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CIVIC CO-LABS */}
        <section className="py-20 px-6 bg-white/[0.02]">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white/[0.03] border border-[#9bd34b]/20 rounded-2xl p-8 md:p-12">
              <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">Civic Co-Labs</p>
              <h2 className="text-2xl md:text-3xl font-bold mb-6">Community-powered research labs where lived experience, data, and policy meet.</h2>
              <p className="text-white/60 leading-relaxed mb-8">
                Civic Co-Labs are Raia Institute's collaborative research environments designed to bring residents, researchers, technologists, nonprofits, and public institutions into the same room — physically and digitally. Each Co-Lab centers on a real civic challenge such as public health access, housing stability, transportation, public safety, or civic participation. Together, participants co-design research questions, contribute community data, analyze outcomes, and translate findings into policy-ready insights.
              </p>
              <h3 className="text-lg font-semibold mb-4">What Civic Co-Labs Enable:</h3>
              <ul className="space-y-3">
                {coLabBullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-[#9bd34b] mt-1">·</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* PARTNERSHIPS */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">Partnership Opportunities</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-12">Collaborate with the Raia Institute</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {partnerships.map((p) => (
                <div key={p.title} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
                  <h3 className="text-xl font-semibold mb-3">{p.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 text-center bg-white/[0.02]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Partner with the Raia Institute</h2>
            <p className="text-white/60 text-lg mb-10">
              Whether you're a researcher, nonprofit, or public institution, we'd love to explore collaboration opportunities.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/contact" className="px-8 py-3 bg-[#9bd34b] text-black font-semibold rounded-full hover:bg-[#9bd34b]/90 transition-colors">
                Get in Touch
              </a>
              <a href="/contact" className="px-8 py-3 border border-white/20 text-white font-semibold rounded-full hover:border-white/40 transition-colors">
                Support Our Work
              </a>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
