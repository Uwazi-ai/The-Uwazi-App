import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Plus, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Block {
  type: "text" | "quiz" | "stat" | "tip";
  content: string;
  options?: string[];
  correctAnswer?: number;
  label?: string;
}

const emptyLesson = {
  title: "",
  slug: "",
  category: "voting",
  difficulty: "beginner",
  xp_reward: 10,
  is_published: false,
  description: "",
  content: [] as Block[],
};

export default function AdminLessonsPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<typeof emptyLesson & { id?: string }>(emptyLesson);
  const queryClient = useQueryClient();

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("*").order("order_index", { ascending: true });
      return data || [];
    },
  });

  const openNew = () => { setEditing({ ...emptyLesson }); setEditorOpen(true); };
  const openEdit = (l: any) => {
    setEditing({
      id: l.id,
      title: l.title,
      slug: l.slug,
      category: l.category || "voting",
      difficulty: l.difficulty || "beginner",
      xp_reward: l.xp_reward || 10,
      is_published: l.is_published || false,
      description: l.description || "",
      content: Array.isArray(l.content) ? l.content as Block[] : [],
    });
    setEditorOpen(true);
  };

  const save = async () => {
    if (!editing.title || !editing.slug) { toast.error("Title and slug required"); return; }
    const payload = {
      title: editing.title,
      slug: editing.slug,
      category: editing.category,
      difficulty: editing.difficulty,
      xp_reward: editing.xp_reward,
      is_published: editing.is_published,
      description: editing.description,
      content: editing.content as unknown as Json,
    };
    if (editing.id) {
      await supabase.from("lessons").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("lessons").insert(payload);
    }
    toast.success("Lesson saved");
    setEditorOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("lessons").update({ is_published: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
    toast.success(current ? "Unpublished" : "Published");
  };

  const duplicate = async (l: any) => {
    await supabase.from("lessons").insert({
      title: `${l.title} (Copy)`,
      slug: `${l.slug}-copy-${Date.now()}`,
      category: l.category,
      difficulty: l.difficulty,
      xp_reward: l.xp_reward,
      is_published: false,
      description: l.description,
      content: l.content,
    });
    queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
    toast.success("Duplicated");
  };

  const deleteLesson = async (id: string) => {
    await supabase.from("lessons").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
    toast.success("Deleted");
  };

  const addBlock = (type: Block["type"]) => {
    setEditing(e => ({
      ...e,
      content: [...e.content, { type, content: "", options: type === "quiz" ? ["", "", "", ""] : undefined, correctAnswer: type === "quiz" ? 0 : undefined, label: type === "stat" ? "" : undefined }],
    }));
  };

  const updateBlock = (idx: number, updates: Partial<Block>) => {
    setEditing(e => ({
      ...e,
      content: e.content.map((b, i) => i === idx ? { ...b, ...updates } : b),
    }));
  };

  const removeBlock = (idx: number) => {
    setEditing(e => ({ ...e, content: e.content.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase font-axis">SUPER ADMIN</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-axis uppercase text-foreground">LESSON MANAGER</h1>
        </div>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Create Lesson</Button>
      </div>

      <Card className="bg-card border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium hidden md:table-cell">Category</th>
              <th className="p-3 font-medium hidden md:table-cell">Difficulty</th>
              <th className="p-3 font-medium hidden md:table-cell">XP</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={6} className="p-3"><Skeleton className="h-6" /></td></tr>)}
            {lessons?.map(l => (
              <tr key={l.id} className="border-b border-border hover:bg-primary/5">
                <td className="p-3 text-foreground font-medium">{l.title}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell capitalize">{l.category}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell capitalize">{l.difficulty}</td>
                <td className="p-3 text-primary hidden md:table-cell">{l.xp_reward}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${l.is_published ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {l.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => openEdit(l)}>Edit</Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => togglePublish(l.id, l.is_published ?? false)}>
                      {l.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => duplicate(l)}><Copy className="h-3 w-3" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-[10px]"><Trash2 className="h-3 w-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete lesson?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteLesson(l.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !lessons?.length && <div className="p-8 text-center text-muted-foreground">No lessons yet. Create your first one!</div>}
      </Card>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-axis">{editing.id ? "EDIT LESSON" : "CREATE LESSON"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <Input value={editing.title} onChange={e => setEditing(p => ({ ...p, title: e.target.value, slug: p.id ? p.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") }))} className="bg-background border-border" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Slug</label>
                <Input value={editing.slug} onChange={e => setEditing(p => ({ ...p, slug: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Category</label>
                <Select value={editing.category} onValueChange={v => setEditing(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{["voting", "legislation", "local-gov", "rights"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Difficulty</label>
                <Select value={editing.difficulty} onValueChange={v => setEditing(p => ({ ...p, difficulty: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{["beginner", "intermediate", "advanced"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">XP Reward</label>
                <Input type="number" value={editing.xp_reward} onChange={e => setEditing(p => ({ ...p, xp_reward: parseInt(e.target.value) || 0 }))} className="bg-background border-border" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea value={editing.description} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} className="bg-background border-border" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_published} onCheckedChange={v => setEditing(p => ({ ...p, is_published: v }))} />
              <span className="text-sm text-muted-foreground">Published</span>
            </div>

            {/* Content Blocks */}
            <div>
              <h4 className="text-xs font-axis uppercase text-foreground mb-2">CONTENT BLOCKS</h4>
              <div className="space-y-3">
                {editing.content.map((block, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-background">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase tracking-wider text-primary font-axis">{block.type}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeBlock(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                    <Textarea value={block.content} onChange={e => updateBlock(idx, { content: e.target.value })} placeholder={block.type === "quiz" ? "Enter question..." : "Enter content..."} className="bg-card border-border text-sm min-h-[60px]" />
                    {block.type === "quiz" && (
                      <div className="mt-2 space-y-1">
                        {block.options?.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input type="radio" checked={block.correctAnswer === oi} onChange={() => updateBlock(idx, { correctAnswer: oi })} className="accent-primary" />
                            <Input value={opt} onChange={e => { const newOpts = [...(block.options || [])]; newOpts[oi] = e.target.value; updateBlock(idx, { options: newOpts }); }} placeholder={`Option ${oi + 1}`} className="bg-card border-border text-xs h-7" />
                          </div>
                        ))}
                      </div>
                    )}
                    {block.type === "stat" && (
                      <Input value={block.label || ""} onChange={e => updateBlock(idx, { label: e.target.value })} placeholder="Stat label" className="mt-2 bg-card border-border text-xs h-7" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                {(["text", "quiz", "stat", "tip"] as const).map(t => (
                  <Button key={t} size="sm" variant="outline" onClick={() => addBlock(t)} className="text-xs capitalize">+ {t}</Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save Lesson</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
