import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useState } from "react";

export default function VideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative aspect-video rounded-2xl overflow-hidden border border-white/[0.08] bg-[#111]"
        >
          {!playing ? (
            <button
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/60 to-transparent" />
              <div className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="h-8 w-8 text-primary-foreground ml-1" />
              </div>
              <p className="absolute bottom-6 text-sm text-white/50">Watch the UWAZI.AI story</p>
            </button>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
              {/* Replace with actual video embed URL */}
              <p>Video player — embed URL needed</p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}