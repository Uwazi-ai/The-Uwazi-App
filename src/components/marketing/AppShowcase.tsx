import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const featurePills = ["Ask Uwazi AI", "Legislation Tracker", "Voting Hub", "Civic Feed"];

export default function AppShowcase() {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-white/[0.08] bg-[#111] overflow-hidden border-l-4 border-l-primary"
          style={{ borderLeftWidth: 4, borderLeftColor: "hsl(var(--primary))" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Left */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <span className="inline-block text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4">
                NOW LIVE
              </span>
              <h2 className="font-heading text-3xl md:text-4xl text-white tracking-tight mb-4">
                YOUR CIVIC CO-PILOT IS READY
              </h2>
              <p className="text-white/50 text-sm leading-relaxed mb-8">
                Ask Uwazi any civic question, track legislation, find your candidates, and build your voting plan — all in one place. Free for every voter.
              </p>
              <div className="mb-8">
                <a
                  href="https://uwaziapp.uwazi.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold text-sm rounded-full hover:bg-primary/90 transition-colors"
                >
                  Open the App <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                {featurePills.map((pill) => (
                  <span
                    key={pill}
                    className="px-3 py-1.5 text-xs font-medium text-white/60 bg-white/[0.06] border border-white/10 rounded-full"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — placeholder */}
            <div className="flex items-center justify-center p-8 md:p-12 bg-gradient-to-br from-primary/[0.05] to-transparent">
              <div className="w-[220px] h-[400px] rounded-[2rem] border-2 border-white/10 bg-[#0a0a0a] flex items-center justify-center shadow-2xl">
                <p className="font-heading text-lg text-white/20 tracking-tight">UWAZI.APP</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
