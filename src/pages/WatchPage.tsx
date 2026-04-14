import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Lock, Volume2, VolumeX, Share2, Info, X } from "lucide-react";

// --- Demo episode data ---
interface Episode {
  id: string;
  title: string;
  description: string;
  date: string;
  category: "Public Safety" | "Housing";
  videoUrl: string;
  thumbnail: string;
}

const EPISODES: Episode[] = [
  {
    id: "1", title: "Why Police Budgets Are Exploding",
    description: "Cities across America are allocating record budgets to police departments. We break down where the money goes and what it means for your community.",
    date: "Apr 10, 2026", category: "Public Safety",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "",
  },
  {
    id: "2", title: "The 911 Response Time Crisis",
    description: "Average 911 response times have increased 40% since 2020. Here's what's driving the delays and how some cities are fixing it.",
    date: "Apr 8, 2026", category: "Public Safety",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: "",
  },
  {
    id: "3", title: "Affordable Housing: Who's Really Building?",
    description: "A deep dive into which developers are actually delivering on affordable housing promises — and which aren't.",
    date: "Apr 5, 2026", category: "Housing",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: "",
  },
  {
    id: "4", title: "Rent Control: Does It Actually Work?",
    description: "Economists and tenants disagree. We look at the data from cities that have tried rent control policies.",
    date: "Apr 3, 2026", category: "Housing",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: "",
  },
  {
    id: "5", title: "Community Policing in Practice",
    description: "Some departments are shifting to community-first policing models. Are they working? We visit three cities to find out.",
    date: "Apr 1, 2026", category: "Public Safety",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnail: "",
  },
  {
    id: "6", title: "Eviction Courts: A Broken System",
    description: "Millions face eviction each year. We investigate how courts are handling the crisis and what reforms are being proposed.",
    date: "Mar 28, 2026", category: "Housing",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "",
  },
];

const FREE_LIMIT = 3;
const CATEGORY_EMOJI: Record<string, string> = { "Public Safety": "🚔", Housing: "🏠" };

export default function WatchPage() {
  const [activeTab, setActiveTab] = useState<"Public Safety" | "Housing">("Public Safety");
  const [muted, setMuted] = useState(true);
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const isSubscriber = false; // TODO: wire to real subscription status

  const filtered = EPISODES.filter((e) => e.category === activeTab);

  const handleTabChange = (tab: "Public Safety" | "Housing") => {
    setActiveTab(tab);
    setInfoOpen(null);
    setShowPaywall(false);
    feedRef.current?.scrollTo({ top: 0 });
  };

  const handleShare = (ep: Episode) => {
    const url = `${window.location.origin}/app/watch?v=${ep.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"));
  };

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col md:relative md:inset-auto md:z-auto md:rounded-xl md:overflow-hidden" style={{ height: "100dvh" }}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
        <span className="text-lg font-black tracking-tight" style={{ color: "#84cc16" }}>UWAZI</span>
        <div className="flex gap-1 bg-white/10 rounded-full p-0.5">
          {(["Public Safety", "Housing"] as const).map((tab) => (
            <button key={tab} onClick={() => handleTabChange(tab)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${activeTab === tab ? "bg-white/20 text-white" : "text-white/60"}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/90 text-black">
          Uwazi+
        </button>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar" style={{ scrollbarWidth: "none" }}>
        {filtered.map((ep, idx) => (
          <VideoCard
            key={ep.id}
            episode={ep}
            index={idx}
            total={filtered.length}
            muted={muted}
            setMuted={setMuted}
            onShare={() => handleShare(ep)}
            infoOpen={infoOpen === ep.id}
            toggleInfo={() => setInfoOpen(infoOpen === ep.id ? null : ep.id)}
            locked={!isSubscriber && idx >= FREE_LIMIT}
            onPaywall={() => setShowPaywall(true)}
          />
        ))}
      </div>

      {/* Paywall modal */}
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

  // Autoplay / pause via IntersectionObserver
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

  // Progress bar
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

  // Trigger paywall on scroll into locked card
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
        src={episode.videoUrl}
        className={`absolute inset-0 w-full h-full object-cover ${locked ? "blur-lg scale-105" : ""}`}
        muted={muted}
        loop
        playsInline
        preload="metadata"
      />

      {/* Gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "55%", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }} />

      {/* Episode counter */}
      <div className="absolute top-16 right-3 z-10 px-2 py-0.5 rounded-full bg-black/50 text-white text-[11px] font-medium">
        {index + 1} / {total}
      </div>

      {!locked && (
        <>
          {/* Bottom left content */}
          <div className="absolute bottom-14 left-4 right-16 z-10">
            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mb-2"
              style={{ background: "#84cc16", color: "#fff" }}>
              {CATEGORY_EMOJI[episode.category]} {episode.category}
            </span>
            <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 mb-1">{episode.title}</h3>
            <p className="text-[#aaa] text-[13px] line-clamp-2 mb-1">{episode.description}</p>
            <p className="text-white/40 text-[11px]">{episode.date}</p>
          </div>

          {/* Right sidebar buttons */}
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

          {/* Info overlay */}
          {infoOpen && (
            <div className="absolute inset-0 z-20 bg-black/80 flex items-end p-6">
              <div className="w-full">
                <button onClick={toggleInfo} className="absolute top-20 right-4 text-white/70"><X size={24} /></button>
                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mb-3"
                  style={{ background: "#84cc16", color: "#fff" }}>
                  {CATEGORY_EMOJI[episode.category]} {episode.category}
                </span>
                <h3 className="text-white font-bold text-xl mb-2">{episode.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed mb-2">{episode.description}</p>
                <p className="text-white/40 text-xs">{episode.date}</p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-10">
            <div ref={progressRef} className="h-full" style={{ background: "#84cc16", width: "0%", transition: "none" }} />
          </div>
        </>
      )}

      {/* Locked overlay */}
      {locked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 mx-6 text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-yellow-400" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Unlock All Episodes</h3>
            <p className="text-white/60 text-sm mb-5">
              You've watched your 3 free clips. Subscribe to Uwazi+ for unlimited access to Policy Power & Progress.
            </p>
            <button className="w-full py-3 rounded-xl font-bold text-black text-sm"
              style={{ background: "linear-gradient(135deg, #facc15, #eab308)" }}>
              Get Uwazi+ — $19.99/mo
            </button>
            <p className="text-white/30 text-[11px] mt-3">Cancel anytime • Includes all premium features</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Paywall modal ───
function PaywallOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground"><X size={20} /></button>
        <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-yellow-400" />
        </div>
        <h3 className="text-foreground font-bold text-xl mb-2">Upgrade to Uwazi+</h3>
        <p className="text-muted-foreground text-sm mb-5">
          Unlimited video episodes, advanced legislation tracking, and unlimited AI questions.
        </p>
        <button className="w-full py-3 rounded-xl font-bold text-black text-sm"
          style={{ background: "linear-gradient(135deg, #facc15, #eab308)" }}>
          Subscribe — $19.99/mo
        </button>
        <p className="text-muted-foreground text-[11px] mt-3">Cancel anytime</p>
      </div>
    </div>
  );
}
