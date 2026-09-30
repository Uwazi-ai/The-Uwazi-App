import { forwardRef, useRef, type ReactNode, type CSSProperties } from "react";

interface Props { children: ReactNode; className?: string; style?: CSSProperties; enabled?: boolean; "data-testid"?: string }

/**
 * Tilts toward the pointer, up to 14 degrees on Y and 11 on X, with a holographic foil layer.
 * Pointer events cover touch and mouse. Releasing eases back flat.
 * Add the class "tilt-flat" before taking a picture to render it flat with the foil at rest.
 */
export const TiltCard = forwardRef<HTMLDivElement, Props>(function TiltCard({ children, className = "", style, enabled = true, ...rest }, ref) {
  const inner = useRef<HTMLDivElement | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const on = enabled && !reduced;

  const setRef = (el: HTMLDivElement | null) => {
    inner.current = el;
    if (typeof ref === "function") ref(el); else if (ref) ref.current = el;
  };
  const move = (e: React.PointerEvent) => {
    const el = inner.current; if (!on || !el) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.classList.add("tilting");
    el.style.setProperty("--ry", `${((px - 0.5) * 28).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - py) * 22).toFixed(2)}deg`);
    el.style.setProperty("--fx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--fy", `${(py * 100).toFixed(1)}%`);
  };
  const reset = () => {
    const el = inner.current; if (!el) return;
    el.classList.remove("tilting");
    ["--rx", "--ry", "--fx", "--fy"].forEach((k) => el.style.removeProperty(k));
  };

  return (
    <div ref={setRef} className={`tilt-card ${className}`} style={style} onPointerMove={move} onPointerLeave={reset} onPointerUp={reset} onPointerCancel={reset} {...rest}>
      {children}
      <div className="tilt-foil" aria-hidden />
    </div>
  );
});

/** Capture a node flat with the foil at rest. */
export async function captureFlat(el: HTMLElement) {
  const html2canvas = (await import("html2canvas-pro")).default;
  const tilt = (el.classList.contains("tilt-card") ? el : el.querySelector(".tilt-card")) as HTMLElement | null;
  tilt?.classList.add("tilt-flat");
  tilt?.classList.remove("tilting");
  try {
    return await html2canvas(el, { backgroundColor: null, scale: 2 });
  } finally {
    tilt?.classList.remove("tilt-flat");
  }
}
