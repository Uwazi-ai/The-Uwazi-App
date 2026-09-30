import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type LibraryVideo, useVideoSource } from "@/lib/videoLibrary";
import { useMyJourney } from "@/hooks/useJourney";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LoadingScreen } from "@/components/LoadingScreen";

function VideoTile({ video, onOpen }: { video: LibraryVideo; onOpen: () => void }) {
  const poster = useVideoSource(video.poster_url);
  const length = `${Math.floor(video.length_seconds / 60)}:${String(video.length_seconds % 60).padStart(2, "0")}`;
  return <article className="min-w-0 overflow-hidden rounded-md border border-border bg-card">
    <Button variant="ghost" onClick={onOpen} aria-label={`Play ${video.title}`} className="h-auto w-full flex-col items-stretch gap-0 rounded-none p-0 text-left hover:bg-secondary">
      <span className="relative block aspect-video w-full bg-secondary"><img src={poster} alt="" className="h-full w-full object-cover" /><span className="absolute bottom-3 right-3 rounded bg-background/90 px-2 py-0.5 text-xs text-foreground">{length}</span><span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"><Play size={16} fill="currentColor" /></span></span>
      <span className="block w-full space-y-1 px-3 py-3"><span className="block text-xs font-medium text-primary">{video.tag}</span><span className="block whitespace-normal font-heading text-base text-foreground">{video.title}</span></span>
    </Button>
  </article>;
}

function Player({ video, close }: { video: LibraryVideo; close: () => void }) {
  const url = useVideoSource(video.url);
  const poster = useVideoSource(video.poster_url);
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col justify-center gap-4 overflow-y-auto rounded-none border-0 bg-background p-4 sm:p-8 [&>button]:hidden"><DialogTitle className="sr-only">{video.title}</DialogTitle><Button size="icon" variant="outline" onClick={close} aria-label="Close video" className="absolute right-4 top-4 z-10"><X /></Button><video src={url} poster={poster} controls autoPlay playsInline className="mx-auto max-h-[72dvh] w-full max-w-5xl bg-secondary object-contain" /><div className="mx-auto w-full max-w-5xl"><p className="text-xs font-semibold text-primary">{video.tag}</p><h2 className="mt-1 font-heading text-2xl">{video.title}</h2><p className="mt-2 text-sm text-muted-foreground">{video.description}</p></div></DialogContent></Dialog>;
}

export default function WatchPage() {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LibraryVideo | null>(null);
  const [params, setParams] = useSearchParams();
  const { journey } = useMyJourney();
  useEffect(() => { let alive = true; supabase.from("videos").select("*").eq("active", true).order("sort_order").order("created_at", { ascending: false }).then(({ data }) => { if (alive) { setVideos((data ?? []) as LibraryVideo[]); setLoading(false); } }); return () => { alive = false; }; }, []);
  const issues = journey?.personalization && journey.dimension_scores ? Object.entries(journey.dimension_scores).sort((a,b) => b[1] - a[1]).slice(0,3).map(([key]) => key) : [];
  const ordered = [...videos].sort((a,b) => Number(issues.includes(b.dimension_slug ?? "")) - Number(issues.includes(a.dimension_slug ?? "")) || a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));
  const groups = [...new Set(ordered.map(video => video.tag))];
  const selectedVideo = selected ?? videos.find(video => video.id === params.get("v")) ?? null;
  const close = () => { setSelected(null); if (params.has("v")) { const next = new URLSearchParams(params); next.delete("v"); setParams(next, { replace: true }); } };
  if (loading) return <LoadingScreen fullScreen={false} label="Loading videos" />;
  return <div className="mx-auto max-w-6xl space-y-7 overflow-x-hidden px-4 py-7 pb-28 md:px-8"><header><p className="eyebrow">UWAZI</p><h1 className="font-heading text-3xl text-foreground">Watch</h1></header>
    {!videos.length ? <div className="space-y-4 border-t border-border pt-7"><p className="font-heading text-xl">Videos are coming soon. Check back.</p><Button asChild><Link to="/app/ask">Ask UWAZI <ArrowRight className="h-4 w-4" /></Link></Button></div> : <>{groups.map(tag => <section key={tag} className="space-y-3" aria-label={tag}><h2 className="font-heading text-xl text-foreground">{tag}</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{ordered.filter(video => video.tag === tag).map(video => <VideoTile key={video.id} video={video} onOpen={() => setSelected(video)} />)}</div></section>)}<Button asChild variant="outline"><Link to="/app/ask">Ask UWAZI <ArrowRight className="h-4 w-4" /></Link></Button></>}
    {selectedVideo && <Player video={selectedVideo} close={close} />}
  </div>;
}