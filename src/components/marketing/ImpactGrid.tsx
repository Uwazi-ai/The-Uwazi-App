import { motion } from "framer-motion";
import { Vote, HeartPulse, Home, Shield, Briefcase, Scale } from "lucide-react";

const areas = [
  { icon: Vote, title: "Elections", desc: "Voter education, candidate research, and election preparedness tools." },
  { icon: HeartPulse, title: "Public Health", desc: "Health policy literacy and community wellness data." },
  { icon: Home, title: "Housing", desc: "Housing policy tracking and tenant rights education." },
  { icon: Shield, title: "Public Safety", desc: "Community safety data and policy accountability." },
  { icon: Briefcase, title: "Workforce", desc: "Workforce development policy and economic opportunity." },
  { icon: Scale, title: "Non-Partisan", desc: "Committed to fact-based, non-partisan civic engagement." },
];

export default function ImpactGrid() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6bef9a] mb-3">Areas of Impact</p>
          <h2 className="font-heading text-3xl md:text-4xl text-white tracking-tight">
            WHERE WE WORK
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {areas.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="group rounded-2xl p-6 border border-white/[0.06] bg-[#111] hover:border-[#6bef9a]/20 transition-all duration-300"
              style={{
                boxShadow: "0 0 0 0 transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px -10px rgba(107,239,154,0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 0 transparent";
              }}
            >
              <a.icon className="h-8 w-8 text-[#6bef9a]/70 mb-4" />
              <h3 className="font-heading text-lg text-white mb-2">{a.title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{a.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
