import { useState, useEffect } from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

const companyValues = [
  { title: "Non-Partisan Always", desc: "We do not persuade opinions. We clarify facts." },
  { title: "Truth & Transparency", desc: "We show sources, limitations, and confidence levels." },
  { title: "Privacy by Default", desc: "We minimize data collection and protect user trust." },
  { title: "Community-Led Design", desc: "We build with communities, not around them." },
  { title: "High Craft", desc: "Accessibility, reliability, and clarity are non-negotiable." },
  { title: "Integrity Over Speed", desc: "Trust matters more than shipping fast." },
  { title: "Built to Scale", desc: "Documentation, systems, and sustainability matter." },
];

const howWeWork = [
  "Remote-friendly and async-first",
  "High ownership, low ego",
  "Documentation is a feature",
  "Weekly progress with measurable outcomes",
];

const faqs = [
  { q: "Is UWAZI.AI remote?", a: "Yes. We're a remote-friendly, async-first team. We prioritize outcomes over hours logged." },
  { q: "What does non-partisan mean here?", a: "We do not persuade, advocate, or favor any political position. We clarify facts, show sources, and let people make informed decisions." },
  { q: "How do you protect data?", a: "Privacy by default is a core value. We minimize data collection, encrypt user data, and build systems where trust is verifiable — not just promised." },
  { q: "What is the interview process?", a: "Our process is conversational and skills-focused: (1) Initial call, (2) Skills assessment or work sample, (3) Team interview, (4) Final conversation with leadership." },
  { q: "Can I apply without a traditional background?", a: "Absolutely. We care about what you can do, what you've learned, and how you think — not where you went to school." },
];

const roleOptions = ["Founding CTO", "Content Creator Intern", "General Application"];

export default function CareersPage() {
  const [appForm, setAppForm] = useState({
    role: "", firstName: "", lastName: "", email: "", location: "",
    linkedin: "", portfolio: "", github: "", whyUwazi: "", proudOf: "", consent: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appForm.consent) { toast.error("Please accept the consent checkbox."); return; }
    toast.success("Application submitted! We'll review and get back to you soon.");
    setAppForm({ role: "", firstName: "", lastName: "", email: "", location: "", linkedin: "", portfolio: "", github: "", whyUwazi: "", proudOf: "", consent: false });
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MarketingNav />
      <main>
        {/* HERO */}
        <section className="pt-32 pb-20 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Build Civic Freedom with UWAZI.AI</h1>
            <p className="text-white/60 text-lg md:text-xl max-w-3xl mx-auto mb-10">
              We're building AI-powered civic infrastructure that helps people understand elections, policy, and community issues without confusion or bias. Our work centers trust, accessibility, and real-world impact.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => scrollTo("roles")} className="px-8 py-3 bg-[#9bd34b] text-black font-semibold rounded-full hover:bg-[#9bd34b]/90 transition-colors">
                View Open Roles
              </button>
              <button onClick={() => scrollTo("apply")} className="px-8 py-3 border border-white/20 text-white font-semibold rounded-full hover:border-white/40 transition-colors">
                General Application
              </button>
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
                  UWAZI.AI empowers communities through AI-driven civic tools that simplify complex civic information, strengthen participation, and help organizations measure meaningful impact.
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
                <h3 className="text-[#9bd34b] text-sm font-semibold uppercase tracking-wider mb-4">Vision</h3>
                <p className="text-white/70 leading-relaxed">
                  A future where civic participation is clear, accessible, and continuous — so individuals, nonprofits, and governments can make informed decisions together.
                </p>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              {["Clarity", "Trust", "Action"].map((v) => (
                <span key={v} className="px-4 py-2 rounded-full bg-[#9bd34b]/10 border border-[#9bd34b]/30 text-[#9bd34b] text-sm font-medium">{v}</span>
              ))}
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">Company Standards & Values</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-12">The principles that guide everything we build</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {companyValues.map((v) => (
                <div key={v.title} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                  <p className="text-white/50 text-sm">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW WE WORK */}
        <section className="py-20 px-6 bg-white/[0.02]">
          <div className="max-w-4xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">How We Work</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              {howWeWork.map((h) => (
                <div key={h} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                  <span className="text-[#9bd34b]">·</span>
                  <span className="text-white/70">{h}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* OPEN ROLES */}
        <section id="roles" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-3">Open Roles</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-12">Join us in building the future of civic technology</h2>

            {/* CTO */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 mb-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {["Leadership", "Engineering", "Equity-first"].map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-[#9bd34b]/10 text-[#9bd34b] text-xs font-medium">{t}</span>
                ))}
              </div>
              <h3 className="text-2xl font-bold mb-2">Founding CTO</h3>
              <p className="text-white/60 mb-6">Own the technical vision, architecture, and engineering culture for UWAZI.AI's civic intelligence platform.</p>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-white/80 mb-3">Responsibilities</h4>
                  <ul className="space-y-2 text-white/50 text-sm">
                    <li>· Define and own platform architecture</li>
                    <li>· Build early engineering systems and standards</li>
                    <li>· Oversee security, privacy, and infrastructure</li>
                    <li>· Lead hiring and technical decision-making</li>
                    <li>· Partner with CEO on product and strategy</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white/80 mb-3">Requirements</h4>
                  <ul className="space-y-2 text-white/50 text-sm">
                    <li>· Strong full-stack and cloud experience</li>
                    <li>· Production system ownership</li>
                    <li>· Security-first mindset</li>
                    <li>· Comfort with early-stage ambiguity</li>
                  </ul>
                  <p className="text-white/40 text-xs mt-4 italic">Nice to have: Civic tech, govtech, or AI/NLP/RAG experience</p>
                </div>
              </div>
              <button onClick={() => scrollTo("apply")} className="px-6 py-2.5 bg-[#9bd34b] text-black font-semibold rounded-full text-sm hover:bg-[#9bd34b]/90 transition-colors">
                Apply for Founding CTO
              </button>
            </div>

            {/* Content Creator */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 mb-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {["Internship", "Content", "Creative"].map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-[#9bd34b]/10 text-[#9bd34b] text-xs font-medium">{t}</span>
                ))}
              </div>
              <h3 className="text-2xl font-bold mb-2">Content Creator Intern</h3>
              <p className="text-white/60 mb-6">Create clear, engaging content that makes civic technology approachable and human.</p>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-white/80 mb-3">Responsibilities</h4>
                  <ul className="space-y-2 text-white/50 text-sm">
                    <li>· Short-form video creation and editing</li>
                    <li>· Product explainers and build-in-public content</li>
                    <li>· Social media content support</li>
                    <li>· Content calendar execution</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white/80 mb-3">Requirements</h4>
                  <ul className="space-y-2 text-white/50 text-sm">
                    <li>· Strong storytelling instincts</li>
                    <li>· Basic video editing skills</li>
                    <li>· Comfortable collaborating or appearing on camera</li>
                  </ul>
                </div>
              </div>
              <button onClick={() => scrollTo("apply")} className="px-6 py-2.5 bg-[#9bd34b] text-black font-semibold rounded-full text-sm hover:bg-[#9bd34b]/90 transition-colors">
                Apply for Content Creator Intern
              </button>
            </div>

            {/* General */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
              <h3 className="text-xl font-bold mb-2">Don't See Your Role?</h3>
              <p className="text-white/60 mb-4">For candidates who want to contribute but don't see a listed role, we welcome general applications.</p>
              <button onClick={() => scrollTo("apply")} className="px-6 py-2.5 bg-[#9bd34b] text-black font-semibold rounded-full text-sm hover:bg-[#9bd34b]/90 transition-colors">
                Submit General Application
              </button>
            </div>
          </div>
        </section>

        {/* APPLICATION FORM */}
        <section id="apply" className="py-20 px-6 bg-white/[0.02]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-2">Apply to Join Us</h2>
            <p className="text-white/50 mb-10">We'll review your application and get back to you soon</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label className="text-white/70 mb-2 block text-sm">Role</Label>
                <select value={appForm.role} onChange={(e) => setAppForm({ ...appForm, role: e.target.value })} required className="w-full rounded-md bg-white/[0.05] border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9bd34b]/50">
                  <option value="" className="bg-[#141414]">Select a role</option>
                  {roleOptions.map((r) => <option key={r} value={r} className="bg-[#141414]">{r}</option>)}
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label className="text-white/70 mb-2 block text-sm">First Name</Label>
                  <Input value={appForm.firstName} onChange={(e) => setAppForm({ ...appForm, firstName: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-white/70 mb-2 block text-sm">Last Name</Label>
                  <Input value={appForm.lastName} onChange={(e) => setAppForm({ ...appForm, lastName: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block text-sm">Email</Label>
                <Input type="email" value={appForm.email} onChange={(e) => setAppForm({ ...appForm, email: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block text-sm">Location</Label>
                <Input value={appForm.location} onChange={(e) => setAppForm({ ...appForm, location: e.target.value })} className="bg-white/[0.05] border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block text-sm">LinkedIn URL</Label>
                <Input value={appForm.linkedin} onChange={(e) => setAppForm({ ...appForm, linkedin: e.target.value })} className="bg-white/[0.05] border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block text-sm">Portfolio URL</Label>
                <Input value={appForm.portfolio} onChange={(e) => setAppForm({ ...appForm, portfolio: e.target.value })} className="bg-white/[0.05] border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block text-sm">GitHub URL (optional)</Label>
                <Input value={appForm.github} onChange={(e) => setAppForm({ ...appForm, github: e.target.value })} className="bg-white/[0.05] border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block text-sm">Why UWAZI.AI?</Label>
                <Textarea rows={4} value={appForm.whyUwazi} onChange={(e) => setAppForm({ ...appForm, whyUwazi: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block text-sm">What are you building or proud of?</Label>
                <Textarea rows={4} value={appForm.proudOf} onChange={(e) => setAppForm({ ...appForm, proudOf: e.target.value })} className="bg-white/[0.05] border-white/10 text-white" />
              </div>
              <p className="text-white/40 text-xs">Please include a link to your resume in the Portfolio URL field</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={appForm.consent} onChange={(e) => setAppForm({ ...appForm, consent: e.target.checked })} className="mt-1 accent-[#9bd34b]" />
                <span className="text-white/60 text-sm">I consent to UWAZI.AI storing and processing my application data for recruitment purposes.</span>
              </label>
              <button type="submit" className="px-8 py-3 bg-[#9bd34b] text-black font-semibold rounded-full hover:bg-[#9bd34b]/90 transition-colors">
                Submit Application
              </button>
            </form>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <p className="text-[#9bd34b] text-xs uppercase tracking-[0.2em] font-medium mb-8">Frequently Asked Questions</p>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-6 data-[state=open]:border-[#9bd34b]/20">
                  <AccordionTrigger className="text-left hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-white/60">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 text-center bg-white/[0.02]">
          <div className="max-w-3xl mx-auto">
            <p className="text-xl md:text-2xl font-bold mb-2">Care about democracy? Love building real products?</p>
            <p className="text-xl md:text-2xl font-bold mb-6">Let's build together.</p>
            <p className="text-white/50 mb-8">
              Questions? Reach out at <a href="mailto:careers@uwazi.ai" className="text-[#9bd34b] hover:underline">careers@uwazi.ai</a>
            </p>
            <button onClick={() => scrollTo("apply")} className="px-8 py-3 bg-[#9bd34b] text-black font-semibold rounded-full hover:bg-[#9bd34b]/90 transition-colors">
              Apply Now
            </button>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
