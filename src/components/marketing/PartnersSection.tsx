import { motion } from "framer-motion";

const partners = [
  {
    name: "Intuidy Technologies",
    description: "AI and data infrastructure powering civic intelligence at scale.",
  },
  {
    name: "Culture Club Creative Agency",
    description: "Strategic branding and creative design for civic engagement.",
  },
  {
    name: "Keystone Innovation District",
    description: "Kansas City's hub for community-driven innovation and entrepreneurship.",
  },
];

export default function PartnersSection() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Ecosystem</p>
          <h2 className="font-heading text-3xl md:text-4xl text-white tracking-tight">OUR PARTNERS</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {partners.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-6 border border-white/[0.06] bg-[#111] text-center hover:border-primary/20 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="font-heading text-primary text-lg">{p.name[0]}</span>
              </div>
              <h3 className="font-heading text-base text-white mb-2">{p.name}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{p.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}