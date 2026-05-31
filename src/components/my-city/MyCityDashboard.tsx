import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function MyCityDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState<string | null>(null);
  const [zip, setZip] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [stateCode, setStateCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select(
        "full_address, street_address, address_line1, city, state_code, zip_code, voter_address_street, voter_address_city, voter_address_state, voter_address_zip",
      )
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const composed =
          data.full_address ||
          [
            data.street_address || data.address_line1 || data.voter_address_street,
            data.city || data.voter_address_city,
            data.state_code || data.voter_address_state,
          ]
            .filter(Boolean)
            .join(", ") ||
          null;
        setAddress(composed);
        setZip(data.zip_code || data.voter_address_zip || null);
        setCity(data.city || data.voter_address_city || null);
        setStateCode(data.state_code || data.voter_address_state || null);
      });
  }, [user]);

  const locationString = [city, stateCode].filter(Boolean).join(", ");

  const stats = [
    { label: "Invested in your ZIP", value: "$47.3M" },
    { label: "Per household", value: "$4,180" },
    { label: "Local contractors", value: "38%" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6">
      {/* Hero card — mirrors VotingHubPage */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
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
        <p className="eyebrow text-muted-foreground mb-2">YOUR NEIGHBORHOOD</p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground leading-none">
          YOUR MONEY. YOUR COMMUNITY.
        </h1>
        <p className="text-sm md:text-lg text-muted-foreground mt-2">
          Every dollar invested in your ZIP{locationString ? ` · ${locationString}` : ""}
        </p>

        {address ? (
          <div className="inline-flex items-center gap-2 mt-4 rounded-lg bg-card border border-border px-3 py-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{address}</span>
            {zip && (
              <span className="ml-1 rounded px-1.5 py-0.5 text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                ZIP {zip}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-3">
            <Link to="/app/settings" className="text-primary hover:underline">
              Add your address →
            </Link>{" "}
            for personalized neighborhood data.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          <Button className="bg-primary text-primary-foreground gap-1.5">
            Explore your neighborhood →
          </Button>
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
            onClick={() =>
              navigate(
                `/app/ask?q=${encodeURIComponent(
                  `What's happening with public spending in ZIP ${zip ?? "my area"}?`,
                )}`,
              )
            }
          >
            Ask Uwazi about your ZIP →
          </Button>
        </div>
      </motion.div>

      {/* Stat tiles — match LearnPage StatCard pattern */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {stats.map((t) => (
          <div
            key={t.label}
            className="bg-card rounded-xl border border-border p-3 sm:p-4 text-center min-w-0"
          >
            <p className="text-xl sm:text-2xl font-bold text-primary truncate">{t.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium truncate mt-1">
              {t.label}
            </p>
          </div>
        ))}
      </div>

      {/* Coming soon card — matches Learn lesson card surface */}
      <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
        <div className="text-2xl mb-2">🏙️</div>
        <h3 className="font-bold text-foreground text-base sm:text-lg">
          Full neighborhood intelligence loading
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
          City contracts, state spending, federal awards, and full contractor transparency —
          personalized to your ZIP. Coming in the next update.
        </p>
        <span className="inline-block mt-4 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase bg-primary/10 text-primary border-primary/20">
          Uwazi+ Exclusive
        </span>
      </div>
    </div>
  );
}
