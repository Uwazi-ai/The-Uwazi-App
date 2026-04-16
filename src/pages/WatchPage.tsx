import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Lock, Volume2, VolumeX, Share2, Info, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Episode {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  topic: string;
  topic_emoji: string | null;
  video_url: string | null;
  is_free: boolean;
}

export default function WatchPage() {
  const [activeTab, setActiveTab] = useState<string>("Public Safety");
  const [muted, setMuted] = useState(true);
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const isSubscriber = false; // TODO: wire to real subscription status

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("episodes")
        .select("id, title, description, date, topic, topic_emoji, video_url, is_free")
        .eq("is_published", true)
        .eq("topic", activeTab)
        .order("sort_order", { ascending: true });
      setEpisodes((data as Episode[]) || []);
      setLoading(false);
    };
    fetchVideos();
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setInfoOpen(null);
    setShowPaywall(false);
    feedRef.current?.scrollTo({ top: 0 });
  };

  const handleShare = (ep: Episode) => {
    const url = `${window.location.origin}/app/watch?v=${ep.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"));
  };

  // Determine which episodes are free vs locked
  const freeCount = episodes.filter((e) => e.is_free).length;

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col md:relative md:inset-auto md:z-auto md:rounded-xl md:overflow-hidden" style={{ height: "100dvh" }}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
        <span className="text-lg font-black tracking-tight text-primary">UWAZI</span>
        <div className="flex gap-1 bg-white/10 rounded-full p-0.5">
          {["Public Safety", "Housing"].map((tab) => (
            <button key={tab} onClick={() => handleTabChange(tab)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${activeTab === tab ? "bg-white/20 text-white" : "text-white/60"}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/90 text-black">
          Uwazi+ BETA
        </button>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative w-full snap-start flex-shrink-0 bg-black" style={{ height: "100dvh" }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
              </div>
              <div className="absolute bottom-20 left-4 right-16 space-y-3">
                <div className="h-4 w-24 bg-white/10 rounded-full animate-pulse" />
                <div className="h-6 w-3/4 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : (
          episodes.map((ep, idx) => {
            const locked = !isSubscriber && !ep.is_free;
            return (
              <VideoCard
                key={ep.id}
                episode={ep}
                index={idx}
                total={episodes.length}
                muted={muted}
                setMuted={setMuted}
                onShare={() => handleShare(ep)}
                infoOpen={infoOpen === ep.id}
                toggleInfo={() => setInfoOpen(infoOpen === ep.id ? null : ep.id)}
                locked={locked}
                onPaywall={() => setShowPaywall(true)}
              />
            );
          })
        )}
      </div>

      {showPaywall && <PaywallOverlay onClose={() => setShowPaywall(false)} />}
    </div>
  );
}

// ─── Video card ───
interface VideoCardProps {
  episode: Episode;
  index: number;
  total: number;
  muted: boolean;
  setMuted: (m: boolean) => void;
  onShare: () => void;
  infoOpen: boolean;
  toggleInfo: () => void;
  locked: boolean;
  onPaywall: () => void;
}

function VideoCard({ episode, index, total, muted, setMuted, onShare, infoOpen, toggleInfo, locked, onPaywall }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !locked) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }, { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [locked]);

  useEffect(() => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar) return;
    let raf: number;
    const update = () => {
      if (video.duration) {
        bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!locked) return;
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onPaywall();
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [locked, onPaywall]);

  return (
    <div ref={cardRef} className="relative w-full snap-start flex-shrink-0" style={{ height: "100dvh" }}>
      <video
        ref={videoRef}
        src={episode.video_url || ""}
        className={`absolute inset-0 w-full h-full object-cover ${locked ? "blur-lg scale-105" : ""}`}
        muted={muted}
        loop
        playsInline
        preload="metadata"
      />

      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "55%", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }} />

      <div className="absolute top-16 right-3 z-10 px-2 py-0.5 rounded-full bg-black/50 text-white text-[11px] font-medium">
        {index + 1} / {total}
      </div>

      {!locked && (
        <>
          <div className="absolute bottom-14 left-4 right-16 z-10">
            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mb-2 bg-primary text-primary-foreground">
              {episode.topic_emoji} {episode.topic}
            </span>
            <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 mb-1">{episode.title}</h3>
            <p className="text-[#aaa] text-[13px] line-clamp-2 mb-1">{episode.description}</p>
            <p className="text-white/40 text-[11px]">{episode.date}</p>
          </div>

          <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
            <button onClick={() => setMuted(!muted)} className="p-2 rounded-full bg-black/40 text-white">
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={onShare} className="p-2 rounded-full bg-black/40 text-white">
              <Share2 size={20} />
            </button>
            <button onClick={toggleInfo} className="p-2 rounded-full bg-black/40 text-white">
              <Info size={20} />
            </button>
          </div>

          {infoOpen && (
            <div className="absolute inset-0 z-20 bg-black/80 flex items-end p-6">
              <div className="w-full">
                <button onClick={toggleInfo} className="absolute top-20 right-4 text-white/70"><X size={24} /></button>
                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mb-3 bg-primary text-primary-foreground">
                  {episode.topic_emoji} {episode.topic}
                </span>
                <h3 className="text-white font-bold text-xl mb-2">{episode.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed mb-2">{episode.description}</p>
                <p className="text-white/40 text-xs">{episode.date}</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-10">
            <div ref={progressRef} className="h-full bg-primary" style={{ width: "0%", transition: "none" }} />
          </div>
        </>
      )}

      {locked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-7 mx-6 text-center max-w-sm">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 mb-3">
              <span className="text-[10px] font-bold text-yellow-400 tracking-wider">BETA LAUNCH · 3 MONTHS ONLY</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
              <Lock size={24} className="text-yellow-400" />
            </div>
            <h3 className="text-white font-bold text-xl mb-1">Unlock All Episodes</h3>
            <p className="text-white/60 text-[13px] mb-4">
              Early adopter pricing — locked for the 3-month beta.
            </p>
            <div className="flex items-baseline justify-center gap-2 mb-1">
              <span className="text-white font-black text-3xl">$9.99</span>
              <span className="text-white/40 text-sm line-through">$19.99</span>
              <span className="text-white/60 text-sm">/mo</span>
            </div>
            <p className="text-yellow-400/80 text-[11px] mb-4">or $79/yr · save 34%</p>
            <button className="w-full py-3 rounded-xl font-bold text-black text-sm"
              style={{ background: "linear-gradient(135deg, #facc15, #eab308)" }}>
              Claim Beta Price
            </button>
            <p className="text-white/30 text-[10px] mt-3">Price returns to $19.99/mo after beta · Cancel anytime</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PaywallOverlay({ onClose }: { onClose: () => void }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full text-center relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground"><X size={20} /></button>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 mb-3">
          <span className="text-[10px] font-bold text-yellow-400 tracking-wider">BETA LAUNCH · 3 MONTHS ONLY</span>
        </div>
        <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
          <Lock size={24} className="text-yellow-400" />
        </div>
        <h3 className="text-foreground font-bold text-xl mb-1">Upgrade to Uwazi+</h3>
        <p className="text-muted-foreground text-[13px] mb-4">
          Unlimited videos, full legislation tracking & unlimited AI questions.
        </p>

        {/* Billing toggle */}
        <div className="flex gap-1 bg-muted rounded-full p-1 mb-4">
          <button
            onClick={() => setBilling("monthly")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all ${billing === "monthly" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all ${billing === "annual" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            Annual <span className="text-yellow-500">−34%</span>
          </button>
        </div>

        <div className="flex items-baseline justify-center gap-2 mb-1">
          <span className="text-foreground font-black text-3xl">
            ${billing === "monthly" ? "9.99" : "79"}
          </span>
          <span className="text-muted-foreground text-sm line-through">
            ${billing === "monthly" ? "19.99" : "119"}
          </span>
          <span className="text-muted-foreground text-sm">
            /{billing === "monthly" ? "mo" : "yr"}
          </span>
        </div>
        <p className="text-yellow-500/90 text-[11px] mb-4">
          {billing === "monthly" ? "Beta rate — locked for 3 months" : "Just $6.58/mo billed annually"}
        </p>

        <button className="w-full py-3 rounded-xl font-bold text-black text-sm"
          style={{ background: "linear-gradient(135deg, #facc15, #eab308)" }}>
          Claim Beta Price
        </button>
        <p className="text-muted-foreground text-[10px] mt-3">
          Price returns to ${billing === "monthly" ? "19.99/mo" : "119/yr"} after beta · Cancel anytime
        </p>
      </div>
    </div>
  );
}
