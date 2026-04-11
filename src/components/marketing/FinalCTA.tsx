import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading text-4xl md:text-5xl text-white tracking-tight mb-4">
            YOUR VOTE. YOUR POWER. YOUR CO-PILOT.
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
            Join voters across Missouri using UWAZI to understand their ballot, track legislation, and show up informed.
          </p>
          <div className="flex justify-center mb-6">
            <a
              href="https://uwaziapp.uwazi.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold text-sm rounded-full hover:bg-primary/90 transition-colors"
            >
              Start Using UWAZI Free <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <span className="px-4 py-1.5 bg-primary/20 text-primary text-xs font-medium rounded-full border border-primary/30">
              Web App Available Now
            </span>
            <span className="px-4 py-1.5 bg-white/[0.06] text-white/40 text-xs font-medium rounded-full border border-white/10">
              iOS Coming Soon
            </span>
            <span className="px-4 py-1.5 bg-white/[0.06] text-white/40 text-xs font-medium rounded-full border border-white/10">
              Android Coming Soon
            </span>
          </div>
          <p className="text-xs text-white/30 tracking-wide">
            Non-partisan by design · Built for public trust
          </p>
        </motion.div>
      </div>
    </section>
  );
}
