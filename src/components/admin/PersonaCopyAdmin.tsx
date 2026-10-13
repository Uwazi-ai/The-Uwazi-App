import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadPersonas, personaColor, type Persona } from "@/lib/personas";

const db = supabase as any;
const BANNED = /[, –;()]/;

function Row({ p, onSaved, onDirty }: { p: Persona; onSaved: () => void; onDirty: (slug: string, dirty: boolean) => void }) {
  const [f, setF] = useState({ name: p.name, one_line: p.one_line, strength: p.strength, blind_spot: p.blind_spot, archetype_intro: p.archetype_intro ?? "", archetype_examples: p.archetype_examples ?? "" });
  const startPrompts = [0, 1, 2].map((i) => p.suggested_prompts?.[i] ?? "");
  const [prompts, setPrompts] = useState<string[]>(startPrompts);
  const [busy, setBusy] = useState(false);
  const dirty = f.name !== p.name || f.one_line !== p.one_line || f.strength !== p.strength || f.blind_spot !== p.blind_spot || f.archetype_intro !== (p.archetype_intro ?? "") || f.archetype_examples !== (p.archetype_examples ?? "") || prompts.join("|") !== startPrompts.join("|");
  useEffect(() => { onDirty(p.slug, dirty); }, [dirty, onDirty, p.slug]);
  useEffect(() => () => onDirty(p.slug, false), [onDirty, p.slug]);

  const save = async () => {
    if ([...Object.values(f), ...prompts].some((v) => BANNED.test(v))) return toast.error("Please leave out dashes, semicolons, and parentheses.");
    if ([...Object.values(f), ...prompts].some((v) => !v.trim())) return toast.error("Every field needs words.");
    setBusy(true);
    const { error } = await db.from("compass_personas").update({ ...f, suggested_prompts: prompts.map((x) => x.trim()) }).eq("slug", p.slug);
    setBusy(false);
    if (error) return toast.error("We could not save that. Try again.");
    toast.success(`${f.name} saved.`);
    void loadPersonas(true);
    onSaved();
  };

  return (
    <div className="space-y-2 border-t border-border pt-4 first:border-0 first:pt-0" data-testid={`persona-edit-${p.slug}`}>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: personaColor(p.color) }} />
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Persona name" className="max-w-xs" />
      </div>
      <label className="block text-xs text-muted-foreground">One line
        <Input value={f.one_line} onChange={(e) => setF({ ...f, one_line: e.target.value })} />
      </label>
      <label className="block text-xs text-muted-foreground">Strength, two sentences
        <Textarea rows={2} value={f.strength} onChange={(e) => setF({ ...f, strength: e.target.value })} />
      </label>
      <label className="block text-xs text-muted-foreground">Kind blind spot, one sentence
        <Input value={f.blind_spot} onChange={(e) => setF({ ...f, blind_spot: e.target.value })} />
      </label>
      <label className="block text-xs text-muted-foreground">Archetype line. A tradition or role, never a named person or a party
        <Input value={f.archetype_intro} onChange={(e) => setF({ ...f, archetype_intro: e.target.value })} aria-label="Archetype line" />
      </label>
      <label className="block text-xs text-muted-foreground">Archetype examples, a short list of roles
        <Input value={f.archetype_examples} onChange={(e) => setF({ ...f, archetype_examples: e.target.value })} aria-label="Archetype examples" />
      </label>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Ask UWAZI questions, three</p>
        {prompts.map((q, i) => (
          <Input key={i} value={q} aria-label={`Ask UWAZI question ${i + 1}`}
            onChange={(e) => setPrompts(prompts.map((x, k) => (k === i ? e.target.value : x)))} />
        ))}
      </div>
      <Button size="sm" disabled={!dirty || busy} onClick={save}>Save</Button>
    </div>
  );
}

export function PersonaCopyAdmin({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void } = {}) {
  const [list, setList] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dirtyRows, setDirtyRows] = useState<Record<string, boolean>>({});
  const onDirty = useCallback((slug: string, dirty: boolean) => setDirtyRows((rows) => rows[slug] === dirty ? rows : { ...rows, [slug]: dirty }), []);
  useEffect(() => { onDirtyChange?.(Object.values(dirtyRows).some(Boolean)); }, [dirtyRows, onDirtyChange]);
  const reload = async () => {
    setLoading(true);
    const { data, error } = await db.from("compass_personas").select("*").order("sort_order");
    setError(Boolean(error));
    if (!error) setList(data ?? []);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);
  return (
    <Card className="rounded-lg p-5 space-y-4">
      <div>
        <h2 className="text-xl font-axis uppercase text-foreground">Civic persona words</h2>
        <p className="text-sm text-muted-foreground">A persona says how someone shows up for their city, never what they believe. Keep it plain and fair to every persona.</p>
      </div>
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading persona copy.</p>}
      {error && <p role="alert" className="text-sm text-destructive">We could not load persona copy. <Button variant="link" size="sm" onClick={reload}>Try again</Button></p>}
      {!loading && !error && !list.length && <p className="text-sm text-muted-foreground">No personas yet.</p>}
      {list.map((p) => <Row key={p.slug + p.name + p.one_line + p.strength + p.blind_spot + (p.archetype_intro ?? "") + (p.archetype_examples ?? "") + (p.suggested_prompts ?? []).join("|")} p={p} onSaved={reload} onDirty={onDirty} />)}
    </Card>
  );
}
