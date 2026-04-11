import { useState, useEffect, useRef } from "react";
import policyImage from "@/assets/policy-power-progress.jpg";
import civicStudiosImage from "@/assets/civic-studios.png";
import jamiiImage from "@/assets/jamii-dashboard.png";
import { Link } from "react-router-dom";
import {
  ChevronDown, Check, ArrowRight, Calendar, MapPin,
  Mail, Linkedin, Twitter, Github,
} from "lucide-react";

/* ───────────────────── NAV ───────────────────── */

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  {
    label: "Products",
    children: [
      { label: "UWAZI App", href: "/products/uwazi-app" },
      { label: "Jamii", href: "/products/jamii" },
      { label: "Ask Uwazi", href: "/products/ask-uwazi" },
    ],
  },
  {
    label: "Impact",
    children: [
      { label: "Elections", href: "/impact/elections" },
      { label: "Public Health", href: "/impact/public-health" },
      { label: "Housing", href: "/impact/housing" },
      { label: "Public Safety", href: "/impact/public-safety" },
      { label: "Workforce", href: "/impact/workforce" },
    ],
  },
  { label: "Consulting", href: "/consulting" },
  { label: "Raia Institute", href: "/raia" },
  { label: "Contact", href: "/contact" },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-heading text-xl tracking-tight text-white">
          UWAZI<span className="text-lime-500">.AI</span>
        </Link>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) =>
            link.children ? (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => {
                  clearTimeout(timeout.current);
                  setOpenDrop(link.label);
                }}
                onMouseLeave={() => {
                  timeout.current = setTimeout(() => setOpenDrop(null), 150);
                }}
              >
                <button className="px-3 py-2 text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1">
                  {link.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {openDrop === link.label && (
                  <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-[#141414] border border-white/[0.08] rounded-xl p-2 shadow-2xl">
                    {link.children.map((c) => (
                      <Link
                        key={c.label}
                        to={c.href}
                        className="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.label}
                to={link.href!}
                className="px-3 py-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <a
            href="https://uwaziapp.uwazi.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-white border border-white/20 rounded-full hover:border-white/40 transition-colors"
          >
            Get Started
          </a>
          <Link
            to="/contact"
            className="px-4 py-2 text-sm font-medium bg-lime-500 text-black rounded-full hover:bg-lime-400 transition-colors"
          >
            Book a Demo
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden text-white p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          <div className="space-y-1.5">
            <span className={`block w-6 h-0.5 bg-white transition-transform ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-transform ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </div>
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-[#0a0a0a] border-t border-white/[0.06] px-6 py-4 space-y-2">
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.label} className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-white/40 px-2 pt-2">{link.label}</p>
                {link.children.map((c) => (
                  <Link key={c.label} to={c.href} onClick={() => setMobileOpen(false)} className="block px-2 py-2 text-sm text-white/70 hover:text-white">
                    {c.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link key={link.label} to={link.href!} onClick={() => setMobileOpen(false)} className="block px-2 py-2 text-sm text-white/70 hover:text-white">
                {link.label}
              </Link>
            )
          )}
          <div className="flex gap-3 pt-4">
            <a href="https://uwaziapp.uwazi.ai" target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-4 py-2 text-sm font-medium text-white border border-white/20 rounded-full">Get Started</a>
            <Link to="/contact" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-4 py-2 text-sm font-medium bg-lime-500 text-black rounded-full">Book a Demo</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ───────────────── SECTION 1: HERO ───────────────── */

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <img
        src="/images/web-20photo.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/40 to-[#0a0a0a]" />

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-[0.25em] text-lime-500 mb-6">
          Civic Intelligence Platform
        </p>

        <h1 className="font-heading leading-[0.9] mb-8">
          <span className="block text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tight lg:text-7xl">BUILDING <span className="text-lime-500">CIVIC FREEDOM</span></span>
          <span className="block text-6xl sm:text-7xl md:text-8xl font-black text-lime-500 tracking-tight lg:text-7xl"></span>
          <span className="block text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tight lg:text-7xl"></span>
        </h1>

        <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Community data-driven intelligence for better public outcomes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://uwaziapp.uwazi.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-lime-500 text-black font-semibold text-sm rounded-full hover:bg-lime-400 transition-colors"
          >
            Try the App Free <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/20 text-white font-medium text-sm rounded-full hover:border-white/40 transition-colors"
          >
            Book a Demo
          </Link>
        </div>

        <p className="mt-6 text-xs text-white/30 tracking-wide">
          Free to use · Nonpartisan by design · No credit card required
        </p>
      </div>
    </section>
  );
}

/* ───────────────── SECTION 2: STATS ───────────────── */

const stats = [
  { value: "340M+", label: "Citizens" },
  { value: "189.5M", label: "Voters" },
  { value: "20k", label: "Communities" },
];

function StatsRow() {
  return (
    <section className="border-y border-white/[0.08] bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto py-16 px-6 grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-heading text-4xl md:text-6xl tracking-tight text-lime-500">{s.value}</p>
            <p className="text-sm text-white/40 mt-2 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────── SECTION 3: APP SHOWCASE ───────────────── */

const featurePills = ["Ask Uwazi AI", "Legislation Tracker", "Voting Hub", "Civic Feed"];

function AppShowcase() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-center bg-[#111111] border border-lime-500/20 rounded-2xl overflow-hidden">
          {/* Left */}
          <div className="p-8 md:p-12 border-l-4 border-lime-500">
            <span className="inline-block px-3 py-1 text-[10px] uppercase tracking-widest font-bold bg-lime-500/10 text-lime-500 border border-lime-500/30 rounded-full mb-6">
              Now Live
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
              Your civic co-pilot is ready
            </h2>
            <p className="text-white/50 leading-relaxed mb-8">
              Ask Uwazi any civic question, track legislation, find your candidates, and build your voting plan.  all in one place.  Join the Beta
            </p>
            <a
              href="https://uwaziapp.uwazi.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-lime-500 text-black font-semibold text-sm rounded-full hover:bg-lime-400 transition-colors mb-8"
            >
              Sign up <ArrowRight className="h-4 w-4" />
            </a>
            <div className="flex flex-wrap gap-2">
              {featurePills.map((f) => (
                <span key={f} className="px-3 py-1.5 text-[11px] text-white/60 bg-white/[0.05] border border-white/[0.08] rounded-full">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Right — phone placeholder */}
          <div className="flex items-center justify-center p-8 md:p-12">
            <div className="w-[220px] h-[440px] bg-[#0a0a0a] border-2 border-white/10 rounded-[2.5rem] flex items-center justify-center">
              <span className="font-heading text-lg text-white/30 tracking-tight">UWAZI.APP</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────── SECTION 4: MARQUEE ───────────────── */

function Marquee() {
  const items = [
    { text: "Civic Intelligence", green: false },
    { text: "For All", green: true },
    { text: "Community Driven", green: false },
    { text: "Public Trust", green: true },
  ];
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <section className="py-12 overflow-hidden border-y border-white/[0.06] bg-[#0a0a0a]">
      <div className="flex animate-marquee whitespace-nowrap">
        {repeated.map((item, i) => (
          <span
            key={i}
            className={`mx-8 text-4xl md:text-6xl font-heading font-black tracking-tight ${
              item.green ? "text-lime-500" : "text-white/10"
            }`}
          >
            {item.text}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </section>
  );
}

/* ───────────────── SECTION 5: POLICY POWER ───────────────── */

function PolicySection() {
  return (
    <section className="py-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block px-3 py-1 text-[10px] uppercase tracking-widest font-bold bg-lime-500/10 text-lime-500 border border-lime-500/30 rounded-full mb-6">
            Live Series
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
            Policy, Power &amp; Progress
          </h2>
          <p className="text-white/50 leading-relaxed mb-8">
            A civic conversation series designed to make local policy clearer, more human, and more actionable. In partnership with Keystone Innovation District and Mayor Pro Tem Ryana Parks-Shaw's Office — every 2nd Wednesday.
          </p>

          <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-5 mb-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-white/70">
              <Calendar className="h-4 w-4 text-lime-500 flex-shrink-0" />
              Every 2nd Wednesday · 7:00–8:00 PM CST
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <MapPin className="h-4 w-4 text-lime-500 flex-shrink-0" />
              Keystone CoLAB: 800 E 18th Street, Kansas City, MO 64108
            </div>
          </div>

          <a
            href="http://keynect.ai/e/keystone-sessions-april-8th"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-lime-500 text-black font-semibold text-sm rounded-full hover:bg-lime-400 transition-colors"
          >
            Register for the Next Session <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="aspect-video bg-[#111111] border border-white/[0.08] rounded-2xl overflow-hidden">
          <img src={policyImage} alt="Policy Power & Progress event flyer" className="w-full h-full object-cover" />
        </div>
      </div>
    </section>
  );
}

/* ───────────────── SECTION 6: UWAZI APP PRODUCT ───────────────── */

function UwaziAppProduct() {
  return (
    <section className="py-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block px-3 py-1 text-[10px] uppercase tracking-widest font-bold bg-lime-500/10 text-lime-500 border border-lime-500/30 rounded-full mb-6">
            Products
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-black text-white mb-6 tracking-tight">
            Civic Studios
          </h2>
          <ul className="space-y-4 mb-8">
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-lime-500 mt-0.5 flex-shrink-0" />
              <span className="text-white/70"><strong className="text-white">Youth Studio:</strong> Civic education and leadership development for young people.</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-lime-500 mt-0.5 flex-shrink-0" />
              <span className="text-white/70"><strong className="text-white">Advocacy Studio:</strong> Training and support for advocacy and community organizing.</span>
            </li>
          </ul>

          <a
            href="https://uwaziapp.uwazi.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-lime-500 text-black font-semibold text-sm rounded-full hover:bg-lime-400 transition-colors mb-6"
          >
            Coming This Summer <ArrowRight className="h-4 w-4" />
          </a>

          <div className="flex items-center gap-3 text-sm text-white/50">
            <span>Coming Soon to</span>
            <span className="px-3 py-1 bg-white/[0.05] border border-white/[0.08] rounded-full text-white/60 text-xs">
              Missouri
            </span>
            <span className="px-3 py-1 bg-white/[0.05] border border-white/[0.08] rounded-full text-white/60 text-xs">
              Kansas 
            </span>
          </div>
        </div>

        <div className="aspect-video bg-[#111111] border border-white/[0.08] rounded-2xl overflow-hidden">
          <img src={civicStudiosImage} alt="Civic Studios" className="w-full h-full object-cover" />
        </div>
      </div>
    </section>
  );
}

/* ───────────────── SECTION 7: JAMII ───────────────── */

function JamiiProduct() {
  return (
    <section className="py-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1 aspect-video bg-[#111111] border border-white/[0.08] rounded-2xl overflow-hidden">
          <img src={jamiiImage} alt="Jamii Civic Intelligence dashboard" className="w-full h-full object-cover" />
        </div>

        <div className="order-1 md:order-2">
          <span className="inline-block px-3 py-1 text-[10px] uppercase tracking-widest font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-full mb-6">
            Products
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-black text-white mb-6 tracking-tight">
            JAMII INTELLIGENCE
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
              <span className="text-white/70"><strong className="text-white">Community Sentiment Tool</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
              <span className="text-white/70"><strong className="text-white">Your Policy Co-Pilot Tool</strong></span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ───────────────── SECTION 8: IMPACT GRID ───────────────── */

const impactAreas = [
  { title: "Elections", desc: "Voter education, ballot guides, and turnout tools." },
  { title: "Public Health", desc: "Health literacy and policy awareness." },
  { title: "Housing", desc: "Zoning, rent policy, and housing equity." },
  { title: "Public Safety", desc: "Policing data, oversight, and community trust." },
  { title: "Workforce", desc: "Jobs programs, skills gaps, and economic mobility." },
  { title: "Non-Partisan", desc: "Civic trust built without party bias.", glow: true },
];

function ImpactGrid() {
  return (
    <section className="py-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto text-center mb-16">
        <h2 className="font-heading text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
          Areas of Impact
        </h2>
        <p className="text-white/50">Six pillars of civic intelligence</p>
      </div>
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {impactAreas.map((a) => (
          <div
            key={a.title}
            className={`p-6 rounded-2xl border transition-all ${
              a.glow
                ? "bg-lime-500/[0.05] border-lime-500/30 shadow-[0_0_30px_-10px_rgba(132,204,22,0.2)]"
                : "bg-[#111111] border-white/[0.08] hover:border-white/[0.15]"
            }`}
          >
            <h3 className={`font-heading text-lg font-bold mb-2 ${a.glow ? "text-lime-500" : "text-white"}`}>
              {a.title}
            </h3>
            <p className="text-sm text-white/50 leading-relaxed">{a.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────── SECTION 9: CONSULTING ───────────────── */

const services = [
  "Policy & Legislative",
  "Policy Communications",
  "Election Strategy",
  "Community Research",
  "Community Outreach Design",
];

function ConsultingSection() {
  return (
    <section className="py-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-start">
        <div>
          <h2 className="font-heading text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
            UWAZI Consulting
          </h2>
          <p className="text-white/50 leading-relaxed">
            We partner with nonprofits, governments, and civic organizations to turn data into decisions. Research-backed advisory services across policy, elections, community engagement, and communications.
          </p>
        </div>

        <div className="space-y-3">
          {services.map((s) => (
            <div key={s} className="bg-[#111111] border border-white/[0.08] rounded-xl p-5 flex items-center justify-between hover:border-white/[0.15] transition-colors">
              <span className="text-white font-medium text-sm">{s}</span>
              <span className="text-lime-500 text-sm flex items-center gap-1">
                Learn More <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────── SECTION 10: PARTNERS ───────────────── */

const partners = [
  { name: "Intuidy Technologies", desc: "Our data integration partner. AI-powered software that centralizes your data as a source of truth." },
  { name: "Culture Club Creative Agency", desc: "Our community marketing partner. Community-focused events, civic education, and more." },
  { name: "Keystone Innovation District", desc: "Our venue partner where focus groups, live education sessions, and community meetings happen." },
];

function PartnersSection() {
  return (
    <section className="py-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-heading text-2xl md:text-3xl font-black text-white text-center tracking-tight mb-12 uppercase">
          Meet Our Partners
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {partners.map((p) => (
            <div key={p.name} className="bg-[#111111] border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.15] transition-colors">
              <h3 className="font-heading text-lg font-bold text-white mb-2">{p.name}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────── SECTION 11: FINAL CTA ───────────────── */

function FinalCTA() {
  return (
    <section className="py-32 px-6 bg-[#0a0a0a] text-center">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl md:text-5xl font-black text-white tracking-tight mb-6">
          Your vote. Your power.{" "}
          <span className="text-lime-500">Your co-pilot.</span>
        </h2>
        <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Join voters across Missouri using UWAZI to understand their ballot, track legislation, and show up informed.
        </p>
        <a
          href="https://uwaziapp.uwazi.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 bg-lime-500 text-black font-bold text-sm rounded-full hover:bg-lime-400 transition-colors mb-8"
        >
          Start Using UWAZI Free <ArrowRight className="h-4 w-4" />
        </a>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <span className="px-4 py-1.5 text-xs font-medium bg-lime-500/10 text-lime-500 border border-lime-500/30 rounded-full">
            Web App Available Now
          </span>
          <span className="px-4 py-1.5 text-xs font-medium bg-white/[0.05] text-white/40 border border-white/[0.08] rounded-full">
            iOS Coming Soon
          </span>
          <span className="px-4 py-1.5 text-xs font-medium bg-white/[0.05] text-white/40 border border-white/[0.08] rounded-full">
            Android Coming Soon
          </span>
        </div>

        <p className="text-xs text-white/25 tracking-wide">
          Non-partisan by design · Built for public trust
        </p>
      </div>
    </section>
  );
}

/* ───────────────── FOOTER ───────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0a0a] py-16 px-6">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Col 1 */}
        <div>
          <p className="font-heading text-xl text-white tracking-tight mb-3">
            UWAZI<span className="text-lime-500">.AI</span>
          </p>
          <p className="text-sm text-white/40 leading-relaxed">
            Building civic freedom through clarity, data, and responsible AI.
          </p>
        </div>

        {/* Col 2 */}
        <div>
          <p className="text-xs uppercase tracking-wider text-white/30 mb-4">Explore</p>
          <ul className="space-y-2">
            {["Home", "About", "Products", "Raia Institute", "Policy Power & Progress"].map((l) => (
              <li key={l}><span className="text-sm text-white/50 hover:text-white cursor-pointer transition-colors">{l}</span></li>
            ))}
          </ul>
        </div>

        {/* Col 3 */}
        <div>
          <p className="text-xs uppercase tracking-wider text-white/30 mb-4">Company</p>
          <ul className="space-y-2">
            {["Careers", "Press", "Contact", "Privacy Policy", "Terms"].map((l) => (
              <li key={l}><span className="text-sm text-white/50 hover:text-white cursor-pointer transition-colors">{l}</span></li>
            ))}
          </ul>
        </div>

        {/* Col 4 */}
        <div>
          <p className="text-xs uppercase tracking-wider text-white/30 mb-4">Contact</p>
          <p className="text-sm text-white/50 mb-4">myke@uwazi.ai</p>
          <div className="flex items-center gap-3">
            <Linkedin className="h-4 w-4 text-white/40 hover:text-white cursor-pointer transition-colors" />
            <Twitter className="h-4 w-4 text-white/40 hover:text-white cursor-pointer transition-colors" />
            <Github className="h-4 w-4 text-white/40 hover:text-white cursor-pointer transition-colors" />
            <Mail className="h-4 w-4 text-white/40 hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-white/[0.06] text-center">
        <p className="text-xs text-white/25">© 2026 UWAZI.AI · Non-partisan civic technology</p>
      </div>
    </footer>
  );
}

/* ───────────────── PAGE ───────────────── */

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav />
      <main>
        <Hero />
        <StatsRow />
        <AppShowcase />
        <Marquee />
        <PolicySection />
        <UwaziAppProduct />
        <JamiiProduct />
        <ImpactGrid />
        <ConsultingSection />
        <PartnersSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
