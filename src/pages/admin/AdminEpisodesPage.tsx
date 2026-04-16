import { useState, useCallback } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Plus, Pencil, Trash2, GripVertical, Film, Eye, EyeOff, Check, X, Upload, Link as LinkIcon } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Episode {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  topic_emoji: string | null;
  date: string | null;
  video_url: string | null;
  is_free: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

const TOPICS = [
  { value: "Public Safety", emoji: "🚔" },
  { value: "Housing", emoji: "🏠" },
  { value: "Elections", emoji: "🗳️" },
  { value: "Workforce", emoji: "💼" },
  { value: "Public Health", emoji: "🏥" },
  { value: "Education", emoji: "📚" },
  { value: "Other", emoji: "📌" },
];

export default function AdminEpisodesPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Episode | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: episodes = [], isLoading } = useQuery({
    queryKey: ["admin-episodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .order("topic")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Episode[];
    },
  });

  const filtered = activeFilter === "All" ? episodes : episodes.filter((e) => e.topic === activeFilter);

  const stats = {
    total: episodes.length,
    published: episodes.filter((e) => e.is_published).length,
    free: episodes.filter((e) => e.is_free).length,
    topics: new Set(episodes.map((e) => e.topic)).size,
  };

  const togglePublished = async (ep: Episode) => {
    const { error } = await supabase
      .from("episodes")
      .update({ is_published: !ep.is_published })
      .eq("id", ep.id);
    if (error) { toast.error("Failed to update"); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-episodes"] });
    toast.success(ep.is_published ? "Unpublished" : "Published");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("episodes").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Failed to delete"); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-episodes"] });
    setDeleteTarget(null);
    toast.success("Episode deleted");
  };

  const handleBulkAction = async (action: "publish" | "unpublish" | "delete") => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (action === "delete") {
      const { error } = await supabase.from("episodes").delete().in("id", ids);
      if (error) { toast.error("Failed to delete"); return; }
      toast.success(`${ids.length} episodes deleted`);
    } else {
      const { error } = await supabase
        .from("episodes")
        .update({ is_published: action === "publish" })
        .in("id", ids);
      if (error) { toast.error("Failed to update"); return; }
      toast.success(`${ids.length} episodes ${action === "publish" ? "published" : "unpublished"}`);
    }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-episodes"] });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const openEdit = (ep: Episode) => {
    setEditingEpisode(ep);
    setModalOpen(true);
  };

  const openNew = () => {
    setEditingEpisode(null);
    setModalOpen(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filtered.findIndex((e) => e.id === active.id);
    const newIndex = filtered.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filtered, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(["admin-episodes"], (old: Episode[] = []) => {
      const map = new Map(reordered.map((ep, i) => [ep.id, i + 1]));
      return [...old]
        .map((ep) => (map.has(ep.id) ? { ...ep, sort_order: map.get(ep.id)! } : ep))
        .sort((a, b) => a.topic.localeCompare(b.topic) || a.sort_order - b.sort_order);
    });

    // Persist
    const updates = reordered.map((ep, i) =>
      supabase.from("episodes").update({ sort_order: i + 1 }).eq("id", ep.id)
    );
    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) {
      toast.error("Failed to save order");
      queryClient.invalidateQueries({ queryKey: ["admin-episodes"] });
    } else {
      toast.success("Order saved");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">SUPER ADMIN</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground">Content Manager</h1>
          <p className="text-muted-foreground mt-1">Policy Power & Progress Episodes</p>
        </div>
        <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} className="mr-1" /> Add Episode
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Episodes", value: stats.total, icon: "🎬" },
          { label: "Published", value: stats.published, icon: "✅" },
          { label: "Free Episodes", value: stats.free, icon: "🆓" },
          { label: "Topics", value: stats.topics, icon: "📂" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border p-4">
            <p className="text-2xl font-bold text-foreground">{s.icon} {s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["All", "Public Safety", "Housing", "Elections", "Workforce", "Public Health", "Education", "Other"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
              activeFilter === tab
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction("publish")}>Publish All</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction("unpublish")}>Unpublish All</Button>
          <Button size="sm" variant="destructive" onClick={() => handleBulkAction("delete")}>Delete Selected</Button>
        </div>
      )}

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="p-3 w-8"></th>
                <th className="p-3 font-medium">Title</th>
                <th className="p-3 font-medium hidden md:table-cell">Topic</th>
                <th className="p-3 font-medium hidden md:table-cell">Date</th>
                <th className="p-3 font-medium">Free</th>
                <th className="p-3 font-medium">Published</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No episodes found</td></tr>
              )}
              {filtered.map((ep) => (
                <tr key={ep.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ep.id)}
                      onChange={() => toggleSelect(ep.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="p-3 text-muted-foreground cursor-grab">
                    <GripVertical size={14} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-9 rounded bg-black/50 flex items-center justify-center shrink-0 overflow-hidden">
                        {ep.video_url ? (
                          <video src={ep.video_url} className="w-full h-full object-cover" muted preload="metadata" />
                        ) : (
                          <Film size={14} className="text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-foreground font-medium truncate max-w-[200px]">{ep.title}</span>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {ep.topic_emoji} {ep.topic}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{ep.date || "—"}</td>
                  <td className="p-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ep.is_free ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {ep.is_free ? "FREE" : "PLUS"}
                    </span>
                  </td>
                  <td className="p-3">
                    <Switch
                      checked={ep.is_published}
                      onCheckedChange={() => togglePublished(ep)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(ep)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(ep)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Episode Modal */}
      <EpisodeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEpisode(null); }}
        episode={editingEpisode}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-episodes"] });
          setModalOpen(false);
          setEditingEpisode(null);
        }}
        nextSortOrder={episodes.length + 1}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete this episode?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The video will remain in Cloudinary but will be removed from the feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Episode Modal ───
interface EpisodeModalProps {
  open: boolean;
  onClose: () => void;
  episode: Episode | null;
  onSaved: () => void;
  nextSortOrder: number;
}

function EpisodeModal({ open, onClose, episode, onSaved, nextSortOrder }: EpisodeModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("Public Safety");
  const [date, setDate] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlMode, setUrlMode] = useState(false);

  // Populate form when editing
  const resetForm = useCallback(() => {
    if (episode) {
      setTitle(episode.title);
      setDescription(episode.description || "");
      setTopic(episode.topic);
      setDate(episode.date || "");
      setVideoUrl(episode.video_url || "");
      setIsFree(episode.is_free);
      setIsPublished(episode.is_published);
    } else {
      setTitle("");
      setDescription("");
      setTopic("Public Safety");
      setDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
      setVideoUrl("");
      setIsFree(false);
      setIsPublished(true);
    }
    setUploading(false);
    setUploadProgress(0);
    setUrlMode(false);
  }, [episode]);

  // Re-populate when episode or open state changes
  const prevOpenRef = useState({ open: false, epId: "" })[0];
  const currentKey = `${open}-${episode?.id || ""}`;
  const prevKey = `${prevOpenRef.open}-${prevOpenRef.epId}`;
  if (currentKey !== prevKey) {
    prevOpenRef.open = open;
    prevOpenRef.epId = episode?.id || "";
    if (open) resetForm();
  }

  const topicData = TOPICS.find((t) => t.value === topic);
  const topicEmoji = topicData?.emoji || "📌";

  const handleFileUpload = async (file: File) => {
    if (file.size > 150 * 1024 * 1024) {
      toast.error("File too large. Max 150MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const fileExt = file.name.split(".").pop() || "mp4";
    const filePath = `${topic.toLowerCase().replace(/\s+/g, "-")}/${crypto.randomUUID()}.${fileExt}`;

    try {
      const { data, error } = await supabase.storage
        .from("episode-videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("episode-videos")
        .getPublicUrl(data.path);

      setVideoUrl(urlData.publicUrl);
      setUploadProgress(100);
      toast.success("Upload complete!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (asDraft = false) => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!topic) { toast.error("Topic is required"); return; }

    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      topic,
      topic_emoji: topicEmoji,
      date: date || null,
      video_url: videoUrl || null,
      is_free: isFree,
      is_published: asDraft ? false : isPublished,
      sort_order: episode?.sort_order ?? nextSortOrder,
    };

    let error;
    if (episode) {
      ({ error } = await supabase.from("episodes").update(payload).eq("id", episode.id));
    } else {
      ({ error } = await supabase.from("episodes").insert(payload));
    }

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(episode ? "Episode updated!" : "Episode published! 🎬");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        style={{ animation: "dialogIn 0.25s ease-out" }}
      >
              <DialogHeader>
                <DialogTitle className="text-foreground text-xl">
                  {episode ? "Edit Episode" : "Add Episode"}
                </DialogTitle>
              </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Video Upload */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Video</label>

            {!videoUrl && !urlMode && (
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("video-upload")?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file);
                }}
              >
                <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-foreground font-medium">Drop video here or click to browse</p>
                <p className="text-muted-foreground text-xs mt-1">Accepts: .mp4, .mov, .avi, .webm • Max 100MB</p>
                <input
                  id="video-upload"
                  type="file"
                  accept="video/mp4,video/quicktime,video/avi,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
              </div>
            )}

            {videoUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-green-400" />
                  <span className="text-green-400 font-medium">Upload complete</span>
                  <button onClick={() => setVideoUrl("")} className="ml-auto text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
                <video src={videoUrl} className="w-full max-h-40 rounded-lg object-cover bg-black" controls muted preload="metadata" />
              </div>
            )}

            {!videoUrl && (
              <div className="flex items-center gap-2">
                <button onClick={() => setUrlMode(!urlMode)} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <LinkIcon size={12} /> Or paste a Cloudinary URL
                </button>
              </div>
            )}

            {urlMode && !videoUrl && (
              <Input
                placeholder="https://res.cloudinary.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="bg-background border-border"
              />
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-foreground">Title *</label>
              <span className="text-xs text-muted-foreground">{title.length}/80</span>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="Episode title"
              className="bg-background border-border"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-foreground">Description</label>
              <span className="text-xs text-muted-foreground">{description.length}/200</span>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              placeholder="Brief description..."
              className="bg-background border-border resize-none"
              rows={3}
            />
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Topic *</label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.emoji} {t.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background border-border",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date || <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ? parse(date, "MMM d, yyyy", new Date()) : undefined}
                  onSelect={(d) => d && setDate(format(d, "MMM d, yyyy"))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Access</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsFree(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${isFree ? "bg-green-500/20 border-green-500/50 text-green-400" : "border-border text-muted-foreground"}`}
                >
                  Free
                </button>
                <button
                  onClick={() => setIsFree(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${!isFree ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400" : "border-border text-muted-foreground"}`}
                >
                  Uwazi+
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={isPublished} onCheckedChange={setIsPublished} className="data-[state=checked]:bg-primary" />
                <span className="text-sm text-muted-foreground">{isPublished ? "Published" : "Draft"}</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          {(title || videoUrl) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preview</label>
              <div className="bg-black rounded-xl overflow-hidden aspect-[9/16] max-w-[200px] relative">
                {videoUrl && (
                  <video src={videoUrl} className="absolute inset-0 w-full h-full object-cover" muted preload="metadata" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="inline-block px-1.5 py-0.5 rounded-full text-[8px] font-semibold bg-primary text-primary-foreground mb-1">
                    {topicEmoji} {topic}
                  </span>
                  <p className="text-white font-bold text-[10px] leading-tight line-clamp-2">{title || "Title"}</p>
                  <p className="text-white/50 text-[8px] line-clamp-2 mt-0.5">{description || "Description"}</p>
                  <p className="text-white/30 text-[7px] mt-0.5">{date}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
              Save as Draft
            </Button>
            <Button onClick={() => handleSave(false)} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? "Saving..." : episode ? "Update" : "Publish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
