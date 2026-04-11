import { motion } from "framer-motion";

const stats = [
  { value: "340M+", label: "Citizens" },
  { value: "189.5M", label: "Voters" },
  { value: "20K+", label: "Communities" },
];

export default function StatsRow() {
  return (
    <section className="py-16 border-y border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="font-heading text-3xl sm:text-4xl tracking-tight text-primary md:text-6xl">{s.value}</p>
              <p className="text-sm text-white/40 mt-1 uppercase tracking-[0.1em]">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
