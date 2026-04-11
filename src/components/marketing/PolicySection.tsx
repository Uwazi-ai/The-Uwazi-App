import { motion } from "framer-motion";
import { Calendar, MapPin, Clock } from "lucide-react";

export default function PolicySection() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Left — Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">Community Events</p>
            <h2 className="font-heading text-3xl md:text-4xl text-white tracking-tight mb-6">
              POLICY POWER
              <br />
              & PROGRESS
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-white/60 text-sm">Every 2nd Wednesday</p>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-white/60 text-sm">7:00 – 8:00 PM CST</p>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-white/60 text-sm">Keystone CoLAB</p>
                  <p className="text-white/40 text-sm">800 E 18th Street, Kansas City</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right — Image placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-white/[0.08] flex items-center justify-center"
          >
            <p className="text-white/20 text-sm font-medium">Event Photo</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}