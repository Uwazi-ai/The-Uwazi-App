import { Link } from "react-router-dom";
import { Linkedin, Twitter, Github, Mail } from "lucide-react";

const exploreLinks = [
  { label: "UWAZI App", href: "/products/uwazi-app" },
  { label: "Jamii Intelligence", href: "/products/jamii" },
  { label: "Ask Uwazi", href: "/products/ask-uwazi" },
  { label: "Impact Areas", href: "/impact/elections" },
  { label: "Raia Institute", href: "/raia" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Consulting", href: "/consulting" },
  { label: "Careers", href: "/careers" },
  { label: "Press", href: "/press" },
  { label: "Privacy Policy", href: "/privacy" },
];

const socials = [
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Mail, href: "mailto:hello@uwazi.ai", label: "Email" },
];

export default function MarketingFooter() {
  return (
    <footer className="bg-[#050505] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <p className="font-heading text-xl tracking-tight text-white mb-3">
              UWAZI<span className="text-primary">.AI</span>
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              Community data-driven intelligence for better public outcomes. Building civic freedom for all.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-white/40 mb-4">Explore</h4>
            <ul className="space-y-2.5">
              {exploreLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-white/40 mb-4">Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-white/40 mb-4">Contact</h4>
            <p className="text-sm text-white/60 mb-1">hello@uwazi.ai</p>
            <p className="text-sm text-white/60 mb-4">Kansas City, MO</p>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-colors"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <p className="text-xs text-white/30">© {new Date().getFullYear()} UWAZI.AI — All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
