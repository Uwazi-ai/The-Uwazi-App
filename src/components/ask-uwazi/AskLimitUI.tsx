import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function fmtCountdown(ms: number) {
  if (ms <= 0) return "0:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function AskLimitPaywall({ resetAt, onReset }: { resetAt: string; onReset: () => void }) {
  const navigate = useNavigate();
  const [remaining, setRemaining] = useState(() => new Date(resetAt).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const r = new Date(resetAt).getTime() - Date.now();
      setRemaining(r);
      if (r <= 0) {
        clearInterval(id);
        onReset();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [resetAt, onReset]);

  const countdown = fmtCountdown(remaining);

  return (
    <div
      style={{
        background: "#0f0f0f",
        borderTop: "1px solid rgba(155,211,75,0.2)",
        padding: "20px 16px",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>🔒</span>
          <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: "#fff" }}>
            You've used your 5 free questions
          </h3>
        </div>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#666", marginTop: 6 }}>
          Free questions reset in <span style={{ color: "#EF9F27" }}>{countdown}</span>
        </p>

        <ul className="mt-4 space-y-2">
          {[
            "Unlimited Ask Uwazi questions",
            "My City — neighborhood investment tracker",
            "Premium video feed + all future Uwazi+ features",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9BD34B", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#777" }}>{f}</span>
            </li>
          ))}
        </ul>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} className="my-3.5" />

        <div className="flex justify-between items-baseline">
          <div>
            <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: "#9BD34B" }}>$4.99</span>
            <span style={{ fontSize: 12, color: "#666" }}>/month</span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#EF9F27" }}>
            Price goes up Jul 16
          </span>
        </div>

        <button
          onClick={() => navigate("/app/upgrade?plan=beta_monthly")}
          className="w-full mt-3 transition hover:brightness-110"
          style={{
            background: "#9BD34B",
            color: "#080808",
            borderRadius: 9,
            padding: 13,
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 13,
          }}
        >
          Unlock Unlimited — Subscribe to Uwazi+
        </button>

        <p className="text-center" style={{ fontSize: 11, color: "#555", marginTop: 10 }}>
          Or wait {countdown} for your free questions to reset
        </p>
      </div>
    </div>
  );
}

export function AskLimitPill({
  isPlus,
  remaining,
  resetAt,
  limited,
}: {
  isPlus: boolean;
  remaining: number | null;
  resetAt: string | null;
  limited: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!limited || !resetAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [limited, resetAt]);

  if (isPlus) return null;
  if (remaining === null && !limited) return null;

  let content: React.ReactNode;
  let color = "#aaa";

  if (limited && resetAt) {
    const ms = Math.max(0, new Date(resetAt).getTime() - now);
    color = "#E24B4A";
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    content = <>⏱ Resets in {h}:{m.toString().padStart(2, "0")}:{(total % 60).toString().padStart(2, "0")}</>;
  } else if (remaining === 0) {
    color = "#EF9F27";
    content = <>⬡ Last free question</>;
  } else {
    content = <>⬡ {remaining} questions left today</>;
  }

  return (
    <span
      style={{
        background: "#1e1e1e",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20,
        padding: "5px 12px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {content}
    </span>
  );
}

