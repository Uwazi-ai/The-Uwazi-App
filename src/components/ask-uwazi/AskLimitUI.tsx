import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { openPaywall } from "@/components/plus/Paywall";
import { PlusLogo } from "@/components/plus/PlusLogo";

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

  const resetClock = new Date(resetAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <div className="border-t border-primary/30 bg-card px-4 py-5" data-testid="ask-limit-wall">
      <div className="mx-auto max-w-3xl space-y-3">
        <PlusLogo on_dark={false} className="h-6" />
        <p className="text-base text-foreground">
          You have used your 5 questions for now. They reset in <span className="font-heading text-primary">{countdown}</span>, at {resetClock}. UWAZI Plus is unlimited.
        </p>
        <Button className="w-full" size="lg" onClick={() => navigate("/app/upgrade?plan=monthly")}>Upgrade</Button>
        <button className="block w-full text-center text-xs text-muted-foreground underline" onClick={() => openPaywall("ask")}>See what Plus adds</button>
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

