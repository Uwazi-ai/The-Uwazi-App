import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type HomeVideo = { id: string; title: string; tag: string; length_seconds: number; url: string; poster_url: string; dimension_slug: string | null; sort_order: number };
export type WelcomeVideo = { key: string; url: string; poster_url: string };

function FullVideo({ item, onClose }: { item: { title: string; url: string; poster_url: string }; onClose: () => void }) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-w-5xl border-border bg-background p-2 sm:p-4 [&>button]:text-foreground"><DialogTitle className="sr-only">{item.title}</DialogTitle><video src={item.url} poster={item.poster_url} autoPlay controls playsInline className="max-h-[80dvh] w-full bg-background object-contain" onEnded={onClose} /></DialogContent></Dialog>;
}

export function WelcomeHero({ video, seen, onDismiss }: { video: WelcomeVideo | null; seen: boolean; onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);
  if (!video || seen || closed) return null;
  const finish = () => { setOpen(false); setClosed(true); onDismiss(); };
  return <>
    <section className="relative h-[208px] overflow-hidden rounded-[22px] bg-secondary" aria-label="Welcome to UWAZI" data-testid="welcome-hero">
      <video src={video.url} poster={video.poster_url} muted autoPlay loop playsInline preload="metadata" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-background/25 pointer-events-none" />
      <span className="absolute left-4 top-4 rounded-full border border-border bg-background/75 px-3 py-1 text-[11px] font-bold text-foreground backdrop-blur-md">WELCOME TO UWAZI</span>
      <Button size="icon" variant="secondary" onClick={finish} title="Close welcome video" aria-label="Close welcome video" className="absolute right-3 top-3 rounded-full"><X /></Button>
      <Button size="icon" onClick={() => setOpen(true)} title="Play welcome video with sound" aria-label="Play welcome video with sound" className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md"><Play className="fill-current" /></Button>
      <div className="absolute bottom-4 left-4 text-sm font-semibold text-foreground drop-shadow-md">Your city. Your voice. Your next step.</div>
    </section>
    {open && <FullVideo item={{ title: "Welcome to UWAZI", ...video }} onClose={finish} />}
  </>;
}

function Clip({ clip, active, onOpen }: { clip: HomeVideo; active: boolean; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (active) ref.current?.play().catch(() => {}); else { ref.current?.pause(); if (ref.current) ref.current.currentTime = 0; } }, [active]);
  const minutes = `${Math.floor(clip.length_seconds / 60)}:${String(clip.length_seconds % 60).padStart(2, "0")}`;
  return <div data-clip-id={clip.id} className="relative h-[200px] w-[150px] shrink-0 snap-start overflow-hidden rounded-[8px] border border-border bg-secondary">
    <video ref={ref} src={active ? clip.url : undefined} poster={clip.poster_url} muted loop playsInline preload="none" className="absolute inset-0 h-full w-full object-cover" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/95 via-background/10 to-transparent" />
    <Button variant="ghost" onClick={onOpen} aria-label={`Play ${clip.title} with sound`} className="absolute inset-0 h-full w-full flex-col items-start justify-end gap-1.5 rounded-none p-3 text-left text-foreground hover:bg-background/10 hover:text-foreground">
      <span className="mb-auto flex w-full items-start justify-between gap-1 text-[10px] font-bold"><span className="rounded bg-primary px-1.5 py-0.5 text-primary-foreground">{clip.tag}</span><span className="rounded bg-background/80 px-1.5 py-0.5 text-foreground">{minutes}</span></span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Play className="fill-current" /></span>
      <span className="line-clamp-2 w-full whitespace-normal text-xs font-semibold leading-snug">{clip.title}</span>
    </Button>
  </div>;
}

export function WatchAndLearn({ videos, topIssues, allowCellular }: { videos: HomeVideo[]; topIssues: string[]; allowCellular: boolean }) {
  const [selected, setSelected] = useState<HomeVideo | null>(null);
  const [mostVisible, setMostVisible] = useState<string | null>(null);
  const [wifi, setWifi] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { type?: string; effectiveType?: string; addEventListener?: (type: string, fn: () => void) => void; removeEventListener?: (type: string, fn: () => void) => void } }).connection;
    const check = () => setWifi(connection?.type === "wifi" || (navigator.onLine && !connection));
    check(); connection?.addEventListener?.("change", check);
    return () => connection?.removeEventListener?.("change", check);
  }, []);
  useEffect(() => {
    if (!scroller.current || !videos.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setMostVisible((visible[0].target as HTMLElement).dataset.clipId ?? null);
    }, { root: scroller.current, threshold: [0, .25, .5, .75, 1] });
    scroller.current.querySelectorAll("[data-clip-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [videos]);
  if (!videos.length) return null;
  const ordered = [...videos].sort((a, b) => Number(topIssues.includes(b.dimension_slug ?? "")) - Number(topIssues.includes(a.dimension_slug ?? "")) || a.sort_order - b.sort_order);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return <section className="space-y-3" aria-label="Watch and learn" data-testid="video-row">
    <div className="flex items-end justify-between gap-3"><h2 className="font-heading text-xl text-foreground">Watch and learn</h2><Link to="/app/watch" className="flex items-center gap-1 text-xs font-semibold text-primary">All in Favor <ArrowUpRight className="h-4 w-4" /></Link></div>
    <div ref={scroller} className="flex snap-x gap-3 overflow-x-auto pb-2" data-testid="clip-scroller">
      {ordered.map((clip) => <Clip key={clip.id} clip={clip} active={!!user && !selected && !reduced && (wifi || allowCellular) && mostVisible === clip.id && document.visibilityState === "visible"} onOpen={() => setSelected(clip)} />)}
    </div>
    {selected && <FullVideo item={selected} onClose={() => setSelected(null)} />}
  </section>;
}
