import { Link } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

interface ImpactPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  focusAreas: { title: string; desc: string }[];
  stats?: { value: string; label: string }[];
  ctaText: string;
  ctaLink: string;
}

export default function ImpactPage({ eyebrow, title, intro, focusAreas, stats, ctaText, ctaLink }: ImpactPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>
        {/* HERO */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">{eyebrow}</p>
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6">{title}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{intro}</p>
          </div>
        </section>

        {/* FOCUS AREAS */}
        <section className="py-20 px-6 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {focusAreas.map((f) => (
                <div key={f.title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
                  <h3 className="font-medium mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STATS */}
        {stats && stats.length > 0 && (
          <section className="py-16 px-6">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-heading text-3xl md:text-4xl text-primary mb-2">{s.value}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-20 px-6 border-t border-border">
          <div className="max-w-3xl mx-auto text-center">
            <Link to={ctaLink} className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors">
              {ctaText}
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
