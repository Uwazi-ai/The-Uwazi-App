import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Episode {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  topic_emoji: string | null;
  video_url: string | null;
  date: string | null;
}

export default function EpisodeHero() {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("episodes")
        .select("id, title, description, topic, topic_emoji, video_url, date")
        .eq("is_published", true)
        .eq("is_free", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setEpisode((data as Episode | null) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  if (loading) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-3xl bg-muted animate-pulse"
        style={{ aspectRatio: "16 / 9" }}
      />
    );
  }

  if (!episode) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative w-full overflow-hidden rounded-3xl bg-black group"
      style={{ aspectRatio: "16 / 9", maxHeight: "560px" }}
    >
      {/* Video */}
      {episode.video_url && (
        <video
          ref={videoRef}
          src={episode.video_url}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onClick={togglePlay}
        />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/70 via-transparent to-transparent" />

      {/* Top badge */}
      <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-sm text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
          ✨ Featured
        </span>
        <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/90 text-[10px] font-semibold uppercase tracking-wider">
          {episode.topic_emoji} {episode.topic}
        </span>
      </div>

      {/* Top-right controls */}
      <div className="absolute top-5 right-5 z-10 flex items-center gap-2">
        <button
          onClick={() => setMuted((m) => !m)}
          className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Center play indicator when paused */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/20"
          aria-label="Play"
        >
          <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Play size={36} className="text-white fill-white ml-1" />
          </div>
        </button>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-10">
        <div className="max-w-2xl">
          <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-2">
            Policy Power & Progress
          </p>
          <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl text-white leading-[1.05] mb-3">
            {episode.title}
          </h2>
          {episode.description && (
            <p className="text-sm md:text-base text-white/70 line-clamp-2 mb-5 max-w-xl">
              {episode.description}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Link
              to="/app/watch"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:scale-[1.03] transition-transform"
            >
              <Play size={16} className="fill-black" />
              Watch Now
            </Link>
            <Link
              to="/app/watch"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
            >
              All Episodes
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
