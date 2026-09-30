import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Film, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type LibraryVideo, VIDEO_BUCKET, useVideoSource } from "@/lib/videoLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const db = supabase as any;
type Draft = Omit<LibraryVideo, "id" | "created_at">;
const empty: Draft = { title: "", description: "", tag: "", length_seconds: 60, url: "", poster_url: "", dimension_slug: null, placement: "home_row", sort_order: 0, active: false };
const filePath = (url: string) => {
  const marker = `/home-video-media/`;
  const index = url.indexOf(marker);
  return index < 0 ? null : decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
};

function Preview({ video }: { video: LibraryVideo }) {
  const poster = useVideoSource(video.poster_url);
  const source = useVideoSource(video.url);
  return <video src={source} poster={poster} controls preload="none" className="aspect-video w-36 shrink-0 rounded border border-border bg-secondary object-cover" aria-label={`Preview ${video.title}`} />;
}

export default function AdminVideoLibraryPage() {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [dimensions, setDimensions] = useState<{ slug: string; name: string }[]>([]);
  const [draft, setDraft] = useState<Draft>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const load = async () => {
    const [{ data, error }, dims] = await Promise.all([
      db.from("videos").select("*").order("sort_order").order("created_at", { ascending: false }),
      db.from("compass_dimensions").select("slug,name").order("name"),
    ]);
    if (error) toast.error("Could not load videos.");
    setVideos(data ?? []);
    setDimensions(dims.data ?? []);
  };
  useEffect(() => { load(); }, []);
  const reset = () => { setDraft(empty); setEditing(null); setVideoFile(null); setPosterFile(null); };
  const upload = async (file: File, kind: "video" | "poster", id: string) => {
    if (kind === "video" && file.size > 200 * 1024 * 1024) throw new Error("Video files must be 200 MB or less.");
    if (kind === "poster" && file.size > 10 * 1024 * 1024) throw new Error("Poster images must be 10 MB or less.");
    if (!(kind === "video" ? file.type.startsWith("video/") : file.type.startsWith("image/"))) throw new Error(kind === "video" ? "Choose a video file." : "Choose an image file.");
    const extension = kind === "video" ? (file.type === "video/mp4" ? "mp4" : file.type === "video/webm" ? "webm" : "mov") : (file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");
    const path = `${id}/${kind}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, { contentType: file.type });
    if (error) throw error;
    return { path, url: supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl };
  };
  const save = async () => {
    if (!draft.title.trim() || !draft.tag.trim() || draft.length_seconds < 1 || !Number.isFinite(draft.sort_order)) return toast.error("Add a title, tag, length and order.");
    if (!videoFile && !draft.url) return toast.error("Choose a video file.");
    if (!posterFile && !draft.poster_url) return toast.error("Choose a poster image.");
    if (videoFile && videoFile.size > 200 * 1024 * 1024) return toast.error("Video files must be 200 MB or less.");
    setSaving(true);
    const id = editing ?? crypto.randomUUID();
    const uploaded: string[] = [];
    try {
      let url = draft.url, poster_url = draft.poster_url;
      if (videoFile) { const v = await upload(videoFile, "video", id); url = v.url; uploaded.push(v.path); }
      if (posterFile) { const p = await upload(posterFile, "poster", id); poster_url = p.url; uploaded.push(p.path); }
      const payload = { ...draft, title: draft.title.trim(), tag: draft.tag.trim(), description: draft.description.trim(), url, poster_url };
      const { error } = editing ? await db.from("videos").update(payload).eq("id", editing) : await db.from("videos").insert({ id, ...payload });
      if (error) throw error;
       if (editing) {
         const old = videos.find(video => video.id === editing);
         const replaced = [videoFile && old && filePath(old.url), posterFile && old && filePath(old.poster_url)].filter((path): path is string => !!path);
         if (replaced.length) await supabase.storage.from(VIDEO_BUCKET).remove(replaced);
       }
       reset(); await load(); toast.success("Video saved.");
    } catch (error) {
      if (uploaded.length) await supabase.storage.from(VIDEO_BUCKET).remove(uploaded);
      toast.error(error instanceof Error ? error.message : "Could not save video.");
    } finally { setSaving(false); }
  };
  const change = async (video: LibraryVideo, patch: Partial<LibraryVideo>) => {
    const { error } = await db.from("videos").update(patch).eq("id", video.id);
    if (error) toast.error("Could not update video."); else await load();
  };
  const remove = async (video: LibraryVideo) => {
    if (!window.confirm(`Remove ${video.title}?`)) return;
    const { error } = await db.from("videos").delete().eq("id", video.id);
    if (error) return toast.error("Could not remove video.");
    const paths = [filePath(video.url), filePath(video.poster_url)].filter((path): path is string => !!path);
    if (paths.length) await supabase.storage.from(VIDEO_BUCKET).remove(paths);
    if (editing === video.id) reset();
    await load(); toast.success("Video removed.");
  };
  return <div className="mx-auto max-w-5xl space-y-7 px-4 py-7 pb-28 md:px-8">
    <header><p className="eyebrow">CONTENT</p><h1 className="font-heading text-3xl text-foreground">Video library</h1><Link to="/app/admin/episodes" className="text-sm text-primary">Episode content</Link></header>
    <section className="space-y-4 border-t border-border pt-5" aria-label="Video editor">
      <h2 className="font-heading text-xl">{editing ? "Edit video" : "Add video"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="video-title">Title</Label><Input id="video-title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
        <div><Label htmlFor="video-tag">Tag</Label><Input id="video-tag" placeholder="All in Favor" value={draft.tag} onChange={e => setDraft({ ...draft, tag: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label htmlFor="video-description">Description</Label><Textarea id="video-description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
        <div><Label htmlFor="video-file">Video file</Label><Input id="video-file" type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] ?? null)} /><p className="mt-1 text-xs text-muted-foreground">Up to 200 MB</p></div>
        <div><Label htmlFor="poster-file">Poster image</Label><Input id="poster-file" type="file" accept="image/*" onChange={e => setPosterFile(e.target.files?.[0] ?? null)} /></div>
        <div><Label htmlFor="video-length">Length in seconds</Label><Input id="video-length" type="number" min="1" value={draft.length_seconds} onChange={e => setDraft({ ...draft, length_seconds: Number(e.target.value) })} /></div>
        <div><Label htmlFor="video-order">Sort order</Label><Input id="video-order" type="number" value={draft.sort_order} onChange={e => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></div>
        <div><Label>Issue</Label><Select value={draft.dimension_slug ?? "none"} onValueChange={value => setDraft({ ...draft, dimension_slug: value === "none" ? null : value })}><SelectTrigger aria-label="Issue"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No issue</SelectItem>{dimensions.map(d => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Placement</Label><Select value={draft.placement} onValueChange={(value: Draft["placement"]) => setDraft({ ...draft, placement: value })}><SelectTrigger aria-label="Placement"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="home_row">Home row</SelectItem><SelectItem value="welcome">Welcome</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent></Select></div>
      </div>
      <div className="flex items-center gap-3"><Switch id="video-active" checked={draft.active} onCheckedChange={active => setDraft({ ...draft, active })} /><Label htmlFor="video-active">Active</Label></div>
      <div className="flex gap-2"><Button onClick={save} disabled={saving}>{saving ? "Saving" : editing ? "Save changes" : "Add video"}</Button>{editing && <Button variant="outline" onClick={reset}>Cancel</Button>}</div>
    </section>
    <section className="space-y-3 border-t border-border pt-5" aria-label="Saved videos"><h2 className="font-heading text-xl">Saved videos</h2>
      {!videos.length && <p className="text-sm text-muted-foreground">No videos yet.</p>}
      {videos.map(video => <article key={video.id} className="flex flex-wrap gap-4 rounded-md border border-border bg-card p-3"><Preview video={video} /><div className="min-w-0 flex-1 space-y-2"><h3 className="font-heading text-base">{video.title}</h3><p className="text-xs text-muted-foreground">{video.tag} · {video.placement === "both" ? "Welcome and Home row" : video.placement === "welcome" ? "Welcome" : "Home row"} · Order {video.sort_order}</p><div className="flex flex-wrap items-center gap-2"><Switch aria-label={`Active ${video.title}`} checked={video.active} onCheckedChange={active => change(video, { active })} /><span className="text-xs">Active</span><Button size="sm" variant="outline" onClick={() => change(video, { placement: video.placement === "both" ? "both" : "welcome" })} disabled={video.placement === "welcome" || video.placement === "both"}><Film className="h-4 w-4" />Set welcome</Button><Button size="icon" variant="ghost" aria-label={`Edit ${video.title}`} onClick={() => { const { id, created_at, ...rest } = video; setDraft(rest); setEditing(id); setVideoFile(null); setPosterFile(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Remove ${video.title}`} onClick={() => remove(video)}><Trash2 className="h-4 w-4" /></Button></div></div></article>)}
    </section>
    <Button asChild variant="outline"><Link to="/app/watch">View Watch</Link></Button>
  </div>;
}