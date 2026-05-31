import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function MyCityDashboard() {
  const { user } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [zip, setZip] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_address, street_address, address_line1, city, state_code, zip_code, voter_address_street, voter_address_city, voter_address_state, voter_address_zip")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const composed =
          data.full_address ||
          [data.street_address || data.address_line1 || data.voter_address_street, data.city || data.voter_address_city, data.state_code || data.voter_address_state].filter(Boolean).join(", ") ||
          null;
        setAddress(composed);
        setZip(data.zip_code || data.voter_address_zip || null);
      });
  }, [user]);

  return (
    <div className="min-h-screen px-5 py-6 max-w-3xl mx-auto" style={{ background: "#080808" }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#9BD34B", letterSpacing: "0.15em" }} className="uppercase">
        MY CITY · UWAZI+
      </p>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#666", letterSpacing: "0.15em" }} className="uppercase mt-1">
        YOUR MONEY, YOUR COMMUNITY
      </p>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: "#fff", lineHeight: 1.15 }} className="mt-3">
        What's being built<br />in your neighborhood.
      </h1>

      <div className="mt-5">
        {address ? (
          <div
            className="inline-flex items-center gap-2 rounded-lg"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.12)", padding: "10px 14px" }}
          >
            <span>📍</span>
            <span style={{ fontSize: 13, color: "#aaa" }}>{address}</span>
            {zip && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#9BD34B",
                  background: "rgba(155,211,75,0.12)",
                  border: "1px solid rgba(155,211,75,0.28)",
                  borderRadius: 4,
                  padding: "2px 6px",
                }}
              >
                ZIP {zip}
              </span>
            )}
          </div>
        ) : (
          <Link to="/app/settings" style={{ color: "#9BD34B", fontSize: 13 }}>
            Add your address →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6">
        {[
          { label: "Invested in your ZIP", value: "$47.3M", color: "#9BD34B", sub: "Active + approved FY 2024" },
          { label: "Per household", value: "$4,180", color: "#3B9CB8", sub: "+29% vs city avg" },
          { label: "Local contractors", value: "38%", color: "#EF9F27", sub: "vs 50% city target" },
        ].map((t) => (
          <div
            key={t.label}
            style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 14 }}
          >
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#666", letterSpacing: "0.08em" }} className="uppercase">
              {t.label}
            </p>
            <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: t.color }} className="mt-2">
              {t.value}
            </p>
            <p style={{ fontSize: 10, color: "#666" }} className="mt-1">{t.sub}</p>
          </div>
        ))}
      </div>

      <div
        className="mt-6 text-center"
        style={{ background: "#0f0f0f", border: "1px solid rgba(155,211,75,0.18)", borderRadius: 12, padding: 24 }}
      >
        <div style={{ fontSize: 32 }}>🏙️</div>
        <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: "#fff" }} className="mt-2">
          Full neighborhood intelligence loading
        </h2>
        <p style={{ fontSize: 13, color: "#666" }} className="mt-2 max-w-md mx-auto">
          City contracts, state spending, federal awards, and contractor transparency — all personalized to your ZIP code. Full dashboard coming in the next update.
        </p>
        <span
          className="inline-block mt-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            color: "#080808",
            background: "#9BD34B",
            borderRadius: 999,
            padding: "4px 10px",
          }}
        >
          UWAZI+ EXCLUSIVE
        </span>
      </div>
    </div>
  );
}
