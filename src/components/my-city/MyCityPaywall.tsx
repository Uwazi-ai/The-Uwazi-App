import { useNavigate } from "react-router-dom";

export function MyCityPaywall() {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    // Reuse the existing premium upgrade flow (same one Watch paywall uses)
    navigate("/app/upgrade?plan=beta_monthly");
  };

  return (
    <div className="min-h-screen px-5 py-6 max-w-2xl mx-auto" style={{ background: "#080808" }}>
      {/* Blurred preview */}
      <div className="relative mb-8">
        <div
          style={{ filter: "blur(4px)", opacity: 0.35, pointerEvents: "none" }}
          aria-hidden
        >
          <div
            style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}
          >
            <p style={{ fontSize: 13, color: "#aaa" }}>📍 Your neighborhood · ZIP 64108</p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ background: "#161616", borderRadius: 10, padding: 14 }}>
                  <p style={{ fontSize: 9, color: "#666" }} className="uppercase">Stat</p>
                  <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: "#9BD34B" }}>—</p>
                </div>
              ))}
            </div>
            <div style={{ background: "#161616", borderRadius: 10, padding: 14, marginTop: 12, height: 80 }} />
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(155,211,75,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            🔒
          </div>
        </div>
      </div>

      {/* Paywall card */}
      <div
        className="mx-auto"
        style={{
          background: "#0f0f0f",
          border: "1px solid rgba(155,211,75,0.25)",
          borderRadius: 16,
          padding: "28px 24px",
          maxWidth: 400,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "#9BD34B",
            background: "rgba(155,211,75,0.12)",
            border: "1px solid rgba(155,211,75,0.28)",
            borderRadius: 4,
            padding: "4px 10px",
          }}
        >
          UWAZI+
        </span>
        <p
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#666", letterSpacing: "0.15em" }}
          className="uppercase mt-3"
        >
          YOUR MONEY, YOUR COMMUNITY
        </p>
        <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: "#fff", lineHeight: 1.2 }} className="mt-2">
          Know exactly where<br />every dollar goes.
        </h2>
        <p style={{ fontSize: 13, color: "#777", lineHeight: 1.7 }} className="mt-3">
          My City is an Uwazi+ exclusive. See every city, state, and federal dollar being invested in your ZIP code — with full contractor transparency down to the sub-contractor level.
        </p>

        <ul className="mt-4 space-y-3">
          {[
            "Active projects in your neighborhood",
            "Who's getting the contracts — and how much",
            "Local vs. out-of-state vendor breakdown",
            "MBE/WBE/SBE contractor equity tracking",
            "Public comment alerts for your district",
          ].map((feat) => (
            <li key={feat} className="flex items-center gap-3">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9BD34B", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#aaa" }}>{feat}</span>
            </li>
          ))}
        </ul>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} className="my-5" />

        <div className="flex justify-between items-baseline">
          <div>
            <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: "#9BD34B" }}>$4.99</span>
            <span style={{ fontSize: 13, color: "#666" }}>/month</span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#EF9F27" }}>
            Price increases July 16
          </span>
        </div>

        <button
          onClick={handleSubscribe}
          className="w-full mt-4 transition hover:brightness-110"
          style={{
            background: "#9BD34B",
            color: "#080808",
            borderRadius: 10,
            padding: 14,
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 14,
          }}
        >
          Unlock My City — Subscribe to Uwazi+
        </button>

        <p
          onClick={() => navigate("/login")}
          className="text-center mt-3 cursor-pointer underline"
          style={{ fontSize: 12, color: "#666" }}
        >
          Already subscribed? Sign in to your account →
        </p>
      </div>
    </div>
  );
}
