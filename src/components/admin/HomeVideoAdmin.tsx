import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { HomeVideo } from "@/components/home/HomeVideos";

const db = supabase as any;
const blank = { title: "", tag: "Explainer", length_seconds: 60, url: "", poster_url: "", dimension_slug: "", sort_order: 0, active: false };
export function HomeVideoAdmin() {
  const [welcome, setWelcome] = useState({ url: "", poster_url: "" });
  const [clips, setClips] = useState<HomeVideo[]>([]);
  const [draft, setDraft] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const [v, c] = await Promise.all([db.from("video_assets").select("url,poster_url").eq("key", "welcome_home").maybeSingle(), db.from("videos").select("*").order("sort_order")]);
    setWelcome({ url: v.data?.url ?? "", poster_url: v.data?.poster_url ?? "" }); setClips(c.data ?? []);
  };
  useEffect(() => { load(); }, []);
  const saveWelcome = async () => {
    setSaving(true);
    const result = welcome.url && welcome.poster_url
      ? await db.from("video_assets").upsert({ key: "welcome_home", ...welcome }, { onConflict: "key" })
      : await db.from("video_assets").delete().eq("key", "welcome_home");
    setSaving(false);
    result.error ? toast.error(result.error.message) : toast.success("Welcome video saved");
  };
  const saveClip = async () => {
    setSaving(true);
    const payload = { ...draft, dimension_slug: draft.dimension_slug || null };
    const { error } = editingId ? await db.from("videos").update(payload).eq("id", editingId) : await db.from("videos").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    setDraft(blank); setEditingId(null); load(); toast.success(editingId ? "Clip saved" : "Clip added");
  };
  const updateClip = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await db.from("videos").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  return <section className="space-y-5 rounded-lg border border-border bg-card p-4"><h2 className="font-heading text-xl">Home videos</h2>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="welcome-url">Welcome video URL</Label><Input id="welcome-url" type="url" placeholder="https://" value={welcome.url} onChange={(e) => setWelcome({ ...welcome, url: e.target.value })} /></div><div><Label htmlFor="welcome-poster">Poster image URL</Label><Input id="welcome-poster" type="url" placeholder="https://" value={welcome.poster_url} onChange={(e) => setWelcome({ ...welcome, poster_url: e.target.value })} /></div></div>
    <Button onClick={saveWelcome} disabled={saving || (!!welcome.url !== !!welcome.poster_url)}>Save welcome video</Button><p className="text-xs text-muted-foreground">Clear both URLs and save to hide the welcome video.</p>
    <div className="border-t border-border pt-4"><h3 className="font-heading text-lg mb-3">Watch and learn clips</h3><div className="grid gap-3 sm:grid-cols-2">
      {([ ["title", "Title"], ["tag", "Tag"], ["url", "Video URL"], ["poster_url", "Poster image URL"], ["dimension_slug", "Issue slug"], ["length_seconds", "Length in seconds"], ["sort_order", "Order"] ] as const).map(([key, label]) => <div key={key}><Label htmlFor={`clip-${key}`}>{label}</Label><Input id={`clip-${key}`} type={key === "length_seconds" || key === "sort_order" ? "number" : key === "url" || key === "poster_url" ? "url" : "text"} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: key === "length_seconds" || key === "sort_order" ? Number(e.target.value) : e.target.value })} /></div>)}
    </div><Button className="mt-3" onClick={saveClip} disabled={saving || !draft.title.trim() || !draft.url || !draft.poster_url || draft.length_seconds < 1}>{editingId ? "Save clip" : "Add clip"}</Button>{editingId && <Button variant="ghost" onClick={() => { setEditingId(null); setDraft(blank); }}>Cancel</Button>}</div>
    <div className="space-y-2">{clips.map((clip) => <div key={clip.id} className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-sm"><span className="min-w-0 flex-1 font-semibold">{clip.title}</span><span className="text-muted-foreground">{clip.tag}</span><Label htmlFor={`active-${clip.id}`}>Active</Label><Switch id={`active-${clip.id}`} checked={(clip as HomeVideo & { active?: boolean }).active ?? false} onCheckedChange={(active) => updateClip(clip.id, { active })} /><Button size="sm" variant="outline" onClick={() => { setEditingId(clip.id); setDraft({ title: clip.title, tag: clip.tag, length_seconds: clip.length_seconds, url: clip.url, poster_url: clip.poster_url, dimension_slug: clip.dimension_slug ?? "", sort_order: clip.sort_order, active: (clip as HomeVideo & { active?: boolean }).active ?? false }); }}>Edit</Button></div>)}</div>
  </section>;
}
