import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const services = [
  "Policy & Legislative Analysis",
  "Policy Communications Strategy",
  "Election Strategy & Outreach",
  "Community Research & Insights",
  "Community Outreach Design",
];

export default function ConsultingSection() {
  return (
    <section className="py-20 border-y border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-[#6bef9a] mb-3">Services</p>
          <h2 className="font-heading text-3xl md:text-4xl text-white tracking-tight mb-8">
            UWAZI CONSULTING
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {services.map((s) => (
              <div
                key={s}
                className="flex items-center gap-3 px-5 py-4 rounded-xl border border-white/[0.06] bg-[#111] hover:border-[#6bef9a]/20 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-[#6bef9a] shrink-0" />
                <p className="text-sm text-white/70">{s}</p>
              </div>
            ))}
          </div>
          <Link
            to="/site/consulting"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6bef9a] hover:underline"
          >
            Learn more about consulting <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
