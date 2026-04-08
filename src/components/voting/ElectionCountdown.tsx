import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ElectionCountdownProps {
  electionName?: string;
  electionDate?: string; // ISO date string
  city?: string | null;
  stateCode?: string | null;
  zipCode?: string | null;
}

export default function ElectionCountdown({
  electionName = "2026 General Election",
  electionDate = "2026-11-03",
  city,
  stateCode,
  zipCode,
}: ElectionCountdownProps) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(`${electionDate}T00:00:00`);

    const tick = () => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [electionDate]);

  const units = [
    { value: timeLeft.days, label: "DAYS" },
    { value: timeLeft.hours, label: "HRS" },
    { value: timeLeft.minutes, label: "MIN" },
    { value: timeLeft.seconds, label: "SEC" },
  ];

  const locationString = [city, stateCode, zipCode].filter(Boolean).join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6"
      style={{
        background: "linear-gradient(135deg, rgba(155,211,75,0.08) 0%, rgba(155,211,75,0.03) 50%, transparent 100%)",
        border: "1px solid rgba(155,211,75,0.2)",
      }}
    >
      {/* Top highlight line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(155,211,75,0.4) 30%, rgba(155,211,75,0.4) 70%, transparent)",
        }}
      />

      <p className="eyebrow text-muted-foreground mb-1">🗳️ NEXT ELECTION</p>
      <h2 className="font-heading text-xl sm:text-2xl md:text-3xl text-foreground">{electionName}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {new Date(electionDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>

      {/* Countdown grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-5">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center rounded-xl sm:rounded-2xl py-2 sm:py-3 px-1 sm:px-2 md:px-5"
            style={{
              background: "var(--card-bg, rgba(0,0,0,0.3))",
              border: "1px solid rgba(155,211,75,0.15)",
            }}
          >
            <motion.span
              key={unit.value}
              initial={{ opacity: 0.6, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary leading-none"
              style={{ letterSpacing: "-0.02em" }}
            >
              {String(unit.value).padStart(unit.label === "DAYS" ? 1 : 2, "0")}
            </motion.span>
            <span className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mt-1 sm:mt-1.5">
              {unit.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-5">
        {locationString && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Showing elections for <span className="text-primary font-semibold">{locationString}</span>
          </div>
        )}
        <Button
          onClick={() => document.getElementById("voting-plan-builder")?.scrollIntoView({ behavior: "smooth" })}
          className="bg-primary text-primary-foreground gap-1.5"
        >
          Set Up Voting Plan →
        </Button>
      </div>
    </motion.div>
  );
}
