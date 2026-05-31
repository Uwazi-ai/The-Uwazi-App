import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MyCityPaywall() {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    navigate("/app/upgrade?plan=beta_monthly");
  };

  const features = [
    "Active projects in your neighborhood",
    "Who's getting the contracts — and how much",
    "Local vs. out-of-state vendor breakdown",
    "MBE/WBE/SBE equity tracking",
    "Public comment alerts for your district",
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6">
      {/* Blurred hero preview with lock overlay */}
      <div className="relative">
        <div
          aria-hidden
          className="rounded-3xl p-6 md:p-10 border"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.02) 50%, transparent 100%)",
            borderColor: "hsl(var(--primary) / 0.2)",
            filter: "blur(6px)",
            opacity: 0.3,
            pointerEvents: "none",
          }}
        >
          <p className="eyebrow text-muted-foreground mb-2">YOUR NEIGHBORHOOD</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground leading-none">
            YOUR MONEY. YOUR COMMUNITY.
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground mt-2">
            Every dollar invested in your ZIP
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border h-20" />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="flex items-center justify-center bg-card"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "1px solid hsl(var(--primary) / 0.3)",
            }}
          >
            <Lock className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Paywall card — same hero card surface as Vote */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 md:p-10"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.02) 50%, transparent 100%)",
          border: "1px solid hsl(var(--primary) / 0.2)",
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4) 30%, hsl(var(--primary) / 0.4) 70%, transparent)",
          }}
        />

        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase bg-primary/10 text-primary border-primary/20">
          Uwazi+
        </span>

        <p className="eyebrow text-muted-foreground mt-4 mb-2">YOUR MONEY, YOUR COMMUNITY</p>
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight">
          KNOW EXACTLY WHERE EVERY DOLLAR GOES.
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-3 leading-relaxed max-w-xl">
          My City is Uwazi+ exclusive. See every city, state, and federal dollar invested in your
          ZIP — with full contractor transparency.
        </p>

        <ul className="mt-5 space-y-2.5">
          {features.map((feat) => (
            <li key={feat} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-sm text-muted-foreground">{feat}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-border my-6" />

        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-1">
            <span className="font-heading text-3xl sm:text-4xl text-primary leading-none">
              $4.99
            </span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>
          <span className="text-xs font-semibold text-amber-400">Price increases Jul 16</span>
        </div>

        <Button
          onClick={handleSubscribe}
          className="w-full mt-5 bg-primary text-primary-foreground gap-1.5"
        >
          Unlock My City — Subscribe to Uwazi+
        </Button>

        <p
          onClick={() => navigate("/login")}
          className="text-center text-xs text-muted-foreground mt-3 cursor-pointer hover:text-foreground transition-colors"
        >
          Already subscribed? Sign in →
        </p>
      </motion.div>
    </div>
  );
}
