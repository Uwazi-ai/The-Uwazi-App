import { useEffect, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { TOUR_STEPS, tourDone, markTourDone, REPLAY_EVENT } from "@/lib/appTour";

function findTarget(href: string | null): HTMLElement | null {
  if (!href) return null;
  const els = Array.from(document.querySelectorAll<HTMLElement>(`a[href="${href}"]`));
  return els.find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) ?? null;
}

export function AppTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (user && !tourDone(user.id)) { const t = setTimeout(() => setOpen(true), 1200); return () => clearTimeout(t); }
  }, [user]);
  useEffect(() => {
    const replay = () => { setI(0); setOpen(true); };
    window.addEventListener(REPLAY_EVENT, replay);
    return () => window.removeEventListener(REPLAY_EVENT, replay);
  }, []);

  const step = TOUR_STEPS[i];
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => setRect(findTarget(step.href)?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, step]);

  if (!open) return null;
  const close = () => { if (user) markTourDone(user.id); setOpen(false); };
  const last = i === TOUR_STEPS.length - 1;

  const pad = 6;
  const card: React.CSSProperties = rect
    ? (rect.top > window.innerHeight / 2
        ? { left: Math.max(12, Math.min(rect.left, window.innerWidth - 332)), bottom: window.innerHeight - rect.top + 16 }
        : { left: Math.min(rect.right + 16, window.innerWidth - 332), top: Math.max(12, rect.top) })
    : { left: "50%", top: "50%", transform: "translate(-50%,-50%)" };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300"
          style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px hsl(var(--background) / 0.75)" }} />
      ) : <div className="absolute inset-0 bg-background/75" />}
      <div className="absolute w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card p-5 shadow-xl" style={card}>
        <p className="text-xs font-semibold text-primary">Step {i + 1} of {TOUR_STEPS.length}</p>
        <h2 id="tour-title" className="mt-1 font-heading text-xl text-foreground">{step.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" className="min-h-11" onClick={close}>{last ? "Close" : "Skip tour"}</Button>
          <div className="flex gap-2">
            {i > 0 && <Button variant="outline" className="min-h-11" onClick={() => setI(i - 1)}>Back</Button>}
            <Button className="min-h-11" onClick={() => (last ? close() : setI(i + 1))}>{last ? "Done" : "Next"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
