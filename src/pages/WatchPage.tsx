import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Lock, Volume2, VolumeX, Share2, Info, X, Plus, Check, Heart, Play, Bug } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

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
  const [activeTab, setActiveTab] = useState<string>("All");
  const [muted, setMuted] = useState(true);
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isPremium } = useSubscription();
  const isSubscriber = isPremium;

  // Scroll to requested episode when ?v=<id> is present
  useEffect(() => {
    const targetId = searchParams.get("v");
    if (!targetId || episodes.length === 0 || !feedRef.current) return;
    const idx = episodes.findIndex((e) => e.id === targetId);
    if (idx < 0) return;
    requestAnimationFrame(() => {
      feedRef.current?.scrollTo({ top: idx * feedRef.current.clientHeight, behavior: "auto" });
    });
    const next = new URLSearchParams(searchParams);
    next.delete("v");
    setSearchParams(next, { replace: true });
  }, [episodes, searchParams, setSearchParams]);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      let query = supabase
        .from("episodes")
        .select("id, title, description, date, topic, topic_emoji, video_url, is_free")
        .eq("is_published", true);
      if (activeTab !== "All") {
        query = query.eq("topic", activeTab);
      }
      const { data } = await query.order("sort_order", { ascending: true });
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
      {/* Visually hidden page heading for accessibility */}
      <h1 className="sr-only">Uwazi+ Video Feed</h1>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-black tracking-tight text-primary shrink-0">UWAZI</span>
          <button className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/90 text-black shrink-0">
            Uwazi+ BETA
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all">
                <Plus size={14} strokeWidth={3} />
                <span className="whitespace-nowrap">{activeTab}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-black/90 border-white/10 backdrop-blur-md">
              {["All", "Uwazi", "Public Safety", "Housing", "Elections", "Workforce", "Public Health", "Education"].map((tab) => (
                <DropdownMenuItem
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className="text-white/80 focus:bg-white/10 focus:text-white cursor-pointer text-xs font-medium"
                >
                  <span className="flex-1">{tab}</span>
                  {activeTab === tab && <Check size={14} className="ml-2 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar md:flex md:flex-col md:items-center" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative w-full md:w-auto md:h-screen md:aspect-[9/16] snap-start flex-shrink-0 bg-black" style={{ height: "100dvh" }}>
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
                onUpgrade={() => navigate("/app/upgrade?plan=beta_monthly")}
              />
            );
          })
        )}
      </div>

      {showPaywall && (
        <PaywallOverlay
          onClose={() => {
            setShowPaywall(false);
            // Scroll back to the last free episode the user could watch
            const lastFreeIdx = episodes.map((e) => e.is_free).lastIndexOf(true);
            if (lastFreeIdx >= 0 && feedRef.current) {
              feedRef.current.scrollTo({ top: lastFreeIdx * feedRef.current.clientHeight, behavior: "smooth" });
            }
          }}
          onUpgrade={(plan) => { setShowPaywall(false); navigate(`/app/upgrade?plan=${plan}`); }}
        />
      )}
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
  onUpgrade: () => void;
}

function LikeButton({ episodeId }: { episodeId: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [burst, setBurst] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);

      const { count: total } = await supabase
        .from("episode_likes")
        .select("*", { count: "exact", head: true })
        .eq("episode_id", episodeId);
      if (!cancelled) setCount(total ?? 0);

      if (user) {
        const { data } = await supabase
          .from("episode_likes")
          .select("id")
          .eq("episode_id", episodeId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setLiked(!!data);
      }
    })();
    return () => { cancelled = true; };
  }, [episodeId]);

  const toggle = async () => {
    if (!userId) {
      toast.error("Sign in to like videos");
      return;
    }
    if (liked) {
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("episode_likes")
        .delete()
        .eq("episode_id", episodeId)
        .eq("user_id", userId);
      if (error) {
        setLiked(true);
        setCount((c) => c + 1);
        toast.error("Couldn't unlike");
      }
    } else {
      setLiked(true);
      setCount((c) => c + 1);
      setBurst(true);
      setTimeout(() => setBurst(false), 500);
      const { error } = await supabase
        .from("episode_likes")
        .insert({ episode_id: episodeId, user_id: userId });
      if (error && error.code !== "23505") {
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
        toast.error("Couldn't like");
      }
    }
  };

  return (
    <button onClick={toggle} className="flex flex-col items-center gap-1" aria-label={liked ? "Unlike" : "Like"}>
      <span className="relative p-2 rounded-full bg-black/40 text-white">
        <Heart
          size={20}
          className={`transition-all duration-200 ${liked ? "fill-red-500 text-red-500 scale-110" : "text-white"} ${burst ? "scale-125" : ""}`}
        />
      </span>
      <span className="text-white text-[11px] font-semibold drop-shadow">{count}</span>
    </button>
  );
}

function VideoCard({ episode, index, total, muted, setMuted, onShare, infoOpen, toggleInfo, locked, onPaywall, onUpgrade }: VideoCardProps) {
  const { url: playableUrl } = useEpisodeVideoUrl(episode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [bufferPct, setBufferPct] = useState(0);
  const [debugOpen, setDebugOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [autoplayReason, setAutoplayReason] = useState<string | null>(null);
  const [netProbe, setNetProbe] = useState<{ status?: number; statusText?: string; cors?: string; contentType?: string | null; error?: string } | null>(null);

  const probeNetwork = async (url: string) => {
    try {
      const res = await fetch(url, { method: "HEAD", mode: "cors" });
      setNetProbe({
        status: res.status,
        statusText: res.statusText,
        cors: res.type,
        contentType: res.headers.get("content-type"),
      });
    } catch (err: any) {
      setNetProbe({ error: err?.message || String(err), cors: "blocked-or-network-error" });
    }
  };

  const tryPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    // Guard: don't attempt playback until we have a real source URL
    if (!episode.video_url || !video.src) return;
    if (video.readyState < 2) video.load();
    const p = video.play();
    if (p && typeof p.catch === "function") {
      p.then(() => { setNeedsTap(false); setAutoplayReason(null); }).catch((err) => {
        const reason = `${err?.name || "Error"}: ${err?.message || String(err)}`;
        console.warn("[WatchPage] play failed:", episode.title, err);
        setAutoplayReason(reason);
        setNeedsTap(true);
      });
    }
  };

  const handleTapToPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    // First user gesture — unmute-safe retry
    video.muted = muted;
    tryPlay();
  };

  useEffect(() => {
    const el = cardRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !locked && episode.video_url) {
        tryPlay();
      } else {
        video.pause();
      }
    }, { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, episode.video_url, episode.title]);

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
    <div ref={cardRef} className="relative w-full md:w-auto md:h-screen md:aspect-[9/16] snap-start flex-shrink-0" style={{ height: "100dvh" }}>
      {episode.video_url ? (
        <video
          ref={videoRef}
          src={episode.video_url}
          className={`absolute inset-0 w-full h-full object-cover md:object-contain ${locked ? "blur-lg scale-105" : ""}`}
          muted={muted}
          loop
          playsInline
          autoPlay
          preload="auto"
          onWaiting={() => setIsBuffering(true)}
          onStalled={() => setIsBuffering(true)}
          onLoadStart={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
          onProgress={(e) => {
            const v = e.currentTarget;
            if (v.buffered.length && v.duration) {
              setBufferPct((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
            }
          }}
          onError={(e) => {
            const err = e.currentTarget.error;
            const codeMap: Record<number, string> = {
              1: "MEDIA_ERR_ABORTED",
              2: "MEDIA_ERR_NETWORK",
              3: "MEDIA_ERR_DECODE",
              4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
            };
            const msg = err ? `${codeMap[err.code] || "Unknown"} (${err.code})${err.message ? ": " + err.message : ""}` : "Unknown error";
            console.error("[WatchPage] video error:", episode.title, err);
            setLastError(msg);
            if (episode.video_url) probeNetwork(episode.video_url);
          }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-5xl mb-3">{episode.topic_emoji || "🎬"}</div>
            <p className="text-white/60 text-sm">Video coming soon</p>
          </div>
        </div>
      )}

      {/* Buffering overlay */}
      {isBuffering && episode.video_url && !needsTap && !locked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          {bufferPct > 0 && bufferPct < 100 && (
            <div className="mt-4 w-32">
              <div className="h-1 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-white transition-all duration-300" style={{ width: `${bufferPct}%` }} />
              </div>
              <p className="mt-2 text-center text-white/70 text-[11px] font-medium">Loading {Math.round(bufferPct)}%</p>
            </div>
          )}
        </div>
      )}

      {needsTap && episode.video_url && !locked && (
        <button
          onClick={handleTapToPlay}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          aria-label="Tap to play"
        >
          <span className="flex items-center justify-center w-20 h-20 rounded-full bg-white/90 text-black shadow-2xl">
            <Play size={32} className="ml-1" fill="currentColor" />
          </span>
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "55%", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }} />

      <div className="absolute top-16 right-3 z-10 px-2 py-0.5 rounded-full bg-black/50 text-white text-[11px] font-medium">
        {index + 1} / {total}
      </div>

      {!locked && (
        <>
          <div className="absolute bottom-[88px] md:bottom-14 left-4 right-16 z-10">
            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mb-2 bg-primary text-primary-foreground">
              {episode.topic_emoji} {episode.topic}
            </span>
            <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 mb-1">{episode.title}</h3>
            <p className="text-[#aaa] text-[13px] line-clamp-2 mb-1">{episode.description}</p>
            <p className="text-white/40 text-[11px]">{episode.date}</p>
          </div>

          <div className="absolute right-3 bottom-[104px] md:bottom-28 z-10 flex flex-col items-center gap-5">
            <LikeButton episodeId={episode.id} />
            <button onClick={() => setMuted(!muted)} className="p-2 rounded-full bg-black/40 text-white" aria-label={muted ? "Unmute video" : "Mute video"}>
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={onShare} className="p-2 rounded-full bg-black/40 text-white" aria-label="Share episode">
              <Share2 size={20} />
            </button>
            <button onClick={toggleInfo} className="p-2 rounded-full bg-black/40 text-white" aria-label="Toggle episode info">
              <Info size={20} />
            </button>
            <button
              onClick={() => {
                if (!debugOpen && episode.video_url) probeNetwork(episode.video_url);
                setDebugOpen((v) => !v);
              }}
              className="p-2 rounded-full bg-black/40 text-white"
              aria-label="Video debug info"
              title="Video issues"
            >
              <Bug size={20} />
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 mb-3">
              <span className="text-[10px] font-bold text-amber-400 tracking-wider">🚀 BETA PRICE</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
              <Lock size={24} className="text-yellow-400" />
            </div>
            <h3 className="text-white font-bold text-xl mb-1">Unlock All Episodes</h3>
            <p className="text-white/60 text-[13px] mb-4">
              Early adopter pricing — locked through the beta.
            </p>
            <div className="flex items-baseline justify-center gap-2 mb-1">
              <span className="text-white font-black text-3xl">$4.99</span>
              <span className="text-white/40 text-sm line-through">$19.99</span>
              <span className="text-white/60 text-sm">/mo</span>
            </div>
            <p className="text-amber-400/90 text-[11px] mb-1">or $39/yr · save 35%</p>
            <p className="text-white/50 text-[11px] mb-4">⏰ Beta pricing ends July 16, 2026</p>
            <button
              onClick={onUpgrade}
              className="w-full py-3 rounded-xl font-bold text-black text-sm"
              style={{ background: "linear-gradient(135deg, #facc15, #eab308)" }}
            >
              Claim Beta Price
            </button>
            <p className="text-white/30 text-[10px] mt-3">Price returns to $19.99/mo after beta · No contracts · Cancel anytime</p>
          </div>
        </div>
      )}

      {debugOpen && (
        <div className="absolute top-16 left-3 right-3 z-40 max-w-md rounded-xl bg-black/85 backdrop-blur-md border border-white/15 p-4 text-white text-[12px] shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold">
              <Bug size={14} className="text-amber-400" />
              <span>Video Debug</span>
            </div>
            <button onClick={() => setDebugOpen(false)} className="text-white/60 hover:text-white" aria-label="Close debug">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-2 font-mono">
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-wider">Episode</div>
              <div className="break-all">{episode.id}</div>
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-wider">Source URL</div>
              <div className="break-all text-white/80">{episode.video_url || "(none)"}</div>
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-wider">Last Video Error</div>
              <div className={lastError ? "text-red-400" : "text-emerald-400"}>{lastError || "None"}</div>
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-wider">Autoplay</div>
              <div className={autoplayReason ? "text-amber-400" : "text-emerald-400"}>{autoplayReason || "OK"}</div>
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-wider">Network Probe</div>
              {netProbe ? (
                netProbe.error ? (
                  <div className="text-red-400">CORS / Network: {netProbe.error}</div>
                ) : (
                  <div className="text-white/80">
                    <div>Status: <span className={netProbe.status && netProbe.status >= 400 ? "text-red-400" : "text-emerald-400"}>{netProbe.status} {netProbe.statusText}</span></div>
                    <div>CORS type: {netProbe.cors}</div>
                    <div>Content-Type: {netProbe.contentType || "n/a"}</div>
                  </div>
                )
              ) : (
                <div className="text-white/50">Not probed yet</div>
              )}
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-wider">Player State</div>
              <div className="text-white/80">
                buffering={String(isBuffering)} · needsTap={String(needsTap)} · buffered={Math.round(bufferPct)}%
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => episode.video_url && probeNetwork(episode.video_url)}
              className="flex-1 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold"
            >
              Re-probe
            </button>
            <button
              onClick={() => { setLastError(null); setAutoplayReason(null); setNetProbe(null); }}
              className="flex-1 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function PaywallOverlay({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: (plan: string) => void }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full text-center relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground"><X size={20} /></button>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 mb-3">
          <span className="text-[10px] font-bold text-amber-400 tracking-wider">🚀 BETA PRICE</span>
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
            Annual <span className="text-amber-500">−35%</span>
          </button>
        </div>

        <div className="flex items-baseline justify-center gap-2 mb-1">
          <span className="text-foreground font-black text-3xl">
            ${billing === "monthly" ? "4.99" : "39"}
          </span>
          <span className="text-muted-foreground text-sm line-through">
            ${billing === "monthly" ? "19.99" : "119"}
          </span>
          <span className="text-muted-foreground text-sm">
            /{billing === "monthly" ? "mo" : "yr"}
          </span>
        </div>
        <p className="text-amber-500/90 text-[11px] mb-1">
          {billing === "monthly" ? "Beta rate — locked through beta" : "Just $3.25/mo billed annually"}
        </p>
        <p className="text-muted-foreground text-[11px] mb-4">⏰ Beta pricing ends July 16, 2026</p>

        <button
          onClick={() => onUpgrade(billing === "monthly" ? "beta_monthly" : "beta_yearly")}
          className="w-full py-3 rounded-xl font-bold text-black text-sm"
          style={{ background: "linear-gradient(135deg, #facc15, #eab308)" }}
        >
          Claim Beta Price
        </button>
        <p className="text-muted-foreground text-[10px] mt-3">
          Price returns to ${billing === "monthly" ? "19.99/mo" : "119/yr"} after beta · No contracts · Cancel anytime
        </p>
      </div>
    </div>
  );
}
