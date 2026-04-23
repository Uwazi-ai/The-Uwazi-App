import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import EpisodeHero from "@/components/home/EpisodeHero";
import FeatureTour from "@/components/home/FeatureTour";

export default function HomePage() {
  const { user } = useAuth();

  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Citizen";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 pb-24 md:pb-10 space-y-8 md:space-y-10">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
          {greeting}
        </p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.02] tracking-tight">
          Welcome back,{" "}
          <span className="text-primary">{displayName}</span>.
        </h1>
        <p className="text-base md:text-lg text-muted-foreground mt-3 max-w-xl">
          Your civic feed, curated. Watch, learn, and act — all in one place.
        </p>
      </motion.div>

      {/* Featured episode hero */}
      <EpisodeHero />

      {/* Feature tour bento grid */}
      <FeatureTour />
    </div>
  );
}
