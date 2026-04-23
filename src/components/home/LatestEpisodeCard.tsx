import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Episode {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  topic_emoji: string | null;
  date: string | null;
  video_url: string | null;
}

export default function LatestEpisodeCard() {
  const navigate = useNavigate();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("episodes")
        .select("id, title, description, topic, topic_emoji, date, video_url")
        .eq("is_published", true)
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

  if (loading) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border bg-card animate-pulse h-44 md:h-52" />
    );
  }

  if (!episode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      className="group rounded-2xl overflow-hidden border border-border bg-card hover-lift cursor-pointer"
      onClick={() => navigate("/app/watch")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/app/watch");
        }
      }}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail */}
        <div className="relative sm:w-64 md:w-72 aspect-video sm:aspect-auto sm:h-auto bg-black overflow-hidden shrink-0">
          {episode.video_url ? (
            <video
              src={episode.video_url}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play size={22} className="text-white fill-white ml-0.5" />
            </div>
          </div>
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
              Latest Episode
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 md:p-6 flex flex-col justify-center min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
            {episode.topic_emoji} {episode.topic}
          </p>
          <h3 className="font-heading text-lg md:text-2xl text-foreground leading-[1.15] line-clamp-2 mb-2">
            {episode.title}
          </h3>
          {episode.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 hidden sm:block">
              {episode.description}
            </p>
          )}
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
            Watch now
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
