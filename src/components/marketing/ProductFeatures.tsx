import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function ProductBlock({
  eyebrow,
  title,
  description,
  features,
  ctaLabel,
  ctaHref,
  imageLabel,
  reversed,
}: {
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  imageLabel: string;
  reversed?: boolean;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${reversed ? "md:[direction:rtl]" : ""}`}>
      <motion.div
        initial={{ opacity: 0, x: reversed ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="md:[direction:ltr]"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">{eyebrow}</p>
        <h2 className="font-heading text-3xl md:text-4xl text-white tracking-tight mb-4">{title}</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-6">{description}</p>
        <ul className="space-y-2 mb-8">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            to={ctaHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
          {ctaHref === "/site/products/uwazi-app" && (
            <a
              href="https://uwaziapp.uwazi.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-full hover:bg-primary/90 transition-colors"
            >
              Open App <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: reversed ? -30 : 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="md:[direction:ltr] aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/[0.07] to-transparent border border-white/[0.08] flex items-center justify-center"
      >
        <p className="text-white/20 text-sm font-medium">{imageLabel}</p>
      </motion.div>
    </div>
  );
}

export default function ProductFeatures() {
  return (
    <section className="py-20 space-y-24">
      <div className="max-w-6xl mx-auto px-6 space-y-24">
        <ProductBlock
          eyebrow="Product"
          title="UWAZI APP"
          description="Your personal civic companion. Learn about your government, track legislation, prepare for elections, and grow your civic literacy — all in one place."
          features={[
            "Personalized civic dashboard",
            "AI-powered civic Q&A",
            "Election prep & voting plans",
            "Gamified civic learning",
          ]}
          ctaLabel="Explore UWAZI App"
          ctaHref="/products/uwazi-app"
          imageLabel="UWAZI App Screenshot"
        />

        <ProductBlock
          eyebrow="Product"
          title="JAMII INTELLIGENCE"
          description="Community-level civic analytics for organizations, nonprofits, and local governments. Understand your community's civic health at scale."
          features={[
            "Community civic health scoring",
            "Voter engagement analytics",
            "Policy impact tracking",
            "Custom research dashboards",
          ]}
          ctaLabel="Learn about Jamii"
          ctaHref="/products/jamii"
          imageLabel="Jamii Dashboard Screenshot"
          reversed
        />
      </div>
    </section>
  );
}