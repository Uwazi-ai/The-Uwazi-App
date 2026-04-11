import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

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
      { label: "Workforce Development", href: "/impact/workforce" },
    ],
  },
  { label: "Consulting", href: "/consulting" },
  { label: "Raia Institute", href: "/raia" },
  { label: "Contact", href: "/contact" },
];

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleEnter = (label: string) => {
    clearTimeout(timeoutRef.current);
    setOpenDropdown(label);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/site" className="font-heading text-xl tracking-tight text-white">
          UWAZI<span className="text-primary">.AI</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) =>
            link.children ? (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => handleEnter(link.label)}
                onMouseLeave={handleLeave}
              >
                <button className="px-3 py-2 text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1">
                  {link.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {openDropdown === link.label && (
                  <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-[#141414] border border-white/[0.08] rounded-xl p-2 shadow-2xl">
                    {link.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.href}
                        className="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                      >
                        {child.label}
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

        {/* CTA Buttons */}
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
            to="/site/contact"
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          >
            Book a Demo
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <div className="space-y-1.5">
            <span className={`block w-6 h-0.5 bg-white transition-transform ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-transform ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#0a0a0a] border-t border-white/[0.06] px-6 py-4 space-y-2">
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.label} className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-white/40 px-2 pt-2">{link.label}</p>
                {link.children.map((child) => (
                  <Link
                    key={child.label}
                    to={child.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-2 py-2 text-sm text-white/70 hover:text-white"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={link.label}
                to={link.href!}
                onClick={() => setMobileOpen(false)}
                className="block px-2 py-2 text-sm text-white/70 hover:text-white"
              >
                {link.label}
              </Link>
            )
          )}
          <div className="flex gap-3 pt-4">
            <a href="https://uwaziapp.uwazi.ai" target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-4 py-2 text-sm font-medium text-white border border-white/20 rounded-full">
              Get Started
            </a>
            <Link to="/contact" className="flex-1 text-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full">
              Book a Demo
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
