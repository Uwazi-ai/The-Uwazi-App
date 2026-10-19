import { useEffect, useRef, useState } from "react";

export const KIOSK_RESULTS_IDLE_MS = 90000;
export const KIOSK_QUIZ_IDLE_MS = 180000;
export const KIOSK_COUNTDOWN_MS = 10000;

export function useCompassKioskIdle(stage: string, onReset: () => void) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const reset = useRef(onReset);
  reset.current = onReset;
  useEffect(() => {
    setCountdown(null);
    if (stage === "intro") return;
    const idle = stage === "result" ? KIOSK_RESULTS_IDLE_MS : KIOSK_QUIZ_IDLE_MS;
    let lastActivity = Date.now();
    const activity = () => { lastActivity = Date.now(); setCountdown(null); };
    const tick = () => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= idle + KIOSK_COUNTDOWN_MS) { activity(); reset.current(); }
      else if (elapsed >= idle) setCountdown(Math.ceil((idle + KIOSK_COUNTDOWN_MS - elapsed) / 1000));
    };
    const timer = window.setInterval(tick, 250);
    const events = ["pointerdown", "keydown", "input", "wheel"];
    events.forEach(event => window.addEventListener(event, activity));
    return () => { window.clearInterval(timer); events.forEach(event => window.removeEventListener(event, activity)); };
  }, [stage]);
  return countdown;
}