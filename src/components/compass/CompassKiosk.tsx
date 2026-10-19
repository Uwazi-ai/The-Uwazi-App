import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import QRCode from "qrcode";
import logo from "@/assets/uwazi-app-logo.png";
import { CompassRose } from "./CompassRose";
import { TiltCard } from "./TiltCard";
import { PersonaBadge } from "./PersonaBadge";
import type { DemoPersona } from "@/lib/compassDemo";
import "./compass-kiosk.css";

export const kioskCopy = (value: string | null | undefined) => (value ?? "").replace(/\s*[—–]\s*/g, ". ");

export function CompassKiosk({ children }: { children: ReactNode }) {
  return <main data-compass-kiosk className="min-h-dvh w-full overflow-x-hidden bg-background text-foreground"><div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pb-8 pt-6 sm:px-10 sm:pt-10"><header className="mb-8 flex items-center justify-between gap-4"><img src={logo} alt="UWAZI" className="h-auto w-32" /><span className="text-sm font-medium text-muted-foreground">Civic Compass</span></header>{children}</div></main>;
}

export function PersonaReveal({ persona, scores }: { persona: DemoPersona; scores: Record<string, number> }) {
  const reduce = useReducedMotion();
  return <motion.div initial={false} animate={reduce ? { opacity: [0.7, 1] } : { y: [32, 0], scale: [0.9, 1], rotateY: [-180, 0] }} transition={{ duration: reduce ? 0.3 : 1.5, ease: [0.2, 0.8, 0.2, 1] }} className="mx-auto w-full max-w-sm"><TiltCard enabled={!reduce} className="overflow-hidden rounded-lg border border-primary/40 bg-card p-6 text-center"><div className="relative z-[3] space-y-3"><p className="text-sm text-primary">Your civic persona</p><div className="flex justify-center"><CompassRose scores={scores} size={220} showIcons={false} draw={!reduce} /></div><div className="flex justify-center"><span className={reduce ? "" : "badge-drop"}><PersonaBadge slug={persona.slug} size="card" label={`${persona.name} persona`} /></span></div><h1 className="font-heading text-3xl leading-tight">{kioskCopy(persona.name)}</h1><p className="text-base leading-relaxed">{kioskCopy(persona.one_line)}</p></div></TiltCard></motion.div>;
}

export function PersonaQR({ personaKey }: { personaKey: string }) {
  const [image, setImage] = useState("");
  const url = `${window.location.origin}/compass/persona/${encodeURIComponent(personaKey)}`;
  useEffect(() => { let active = true; QRCode.toDataURL(url, { width: 192, margin: 3, errorCorrectionLevel: "M" }).then(value => { if (active) setImage(value); }).catch(() => {}); return () => { active = false; }; }, [url]);
  return <section className="space-y-3 text-center"><h2 className="font-heading text-xl">Scan to keep your persona.</h2>{image && <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-14 min-w-14 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Open your public persona page"><img src={image} width={192} height={192} alt="QR code to your public persona page" className="rounded-lg" /></a>}</section>;
}