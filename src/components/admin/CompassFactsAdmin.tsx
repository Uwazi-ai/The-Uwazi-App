import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const db = supabase as any;

export function CompassFactsAdmin() {
  const [dims, setDims] = useState<{ id: string; name: string }[]>([]);
  const [facts, setFacts] = useState<any[]>([]);
  const [dim, setDim] = useState("");
  const [geoid, setGeoid] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  const load = async () => {
    const [d, f] = await Promise.all([
      db.from("compass_dimensions").select("id, name").order("name"),
      db.from("compass_facts").select("id, dimension_id, geoid, text, source_url, active").order("created_at", { ascending: false }),
    ]);
    setDims(d.data ?? []);
    setFacts(f.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!dim || !text.trim() || !/^https?:\/\//i.test(url.trim())) return toast.error("Pick an issue, write the fact, and add the official web address.");
    const { error } = await db.from("compass_facts").insert({ dimension_id: dim, geoid: geoid.trim() || null, text: text.trim(), source_url: url.trim() });
    if (error) return toast.error("We could not save that fact.");
    toast.success("Fact saved.");
    setText(""); setUrl(""); setGeoid("");
    load();
  };

  const toggle = async (id: string, active: boolean) => {
    await db.from("compass_facts").update({ active: !active }).eq("id", id);
    load();
  };

  const name = (id: string) => dims.find((d) => d.id === id)?.name ?? "";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-foreground">Compass quiz facts</h2>
        <p className="text-sm text-muted-foreground">People see one fact every 4 questions. Each fact needs an official source. Leave the place code empty for a fact that fits everywhere.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={dim} onChange={(e) => setDim(e.target.value)} aria-label="Issue">
          <option value="">Pick an issue</option>
          {dims.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <Input placeholder="Place code, for example 2938000" value={geoid} onChange={(e) => setGeoid(e.target.value)} />
      </div>
      <Textarea placeholder="Write the fact in short, plain words." value={text} onChange={(e) => setText(e.target.value)} />
      <Input placeholder="Official source web address, required" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Button onClick={save}>Save the fact</Button>
      <ul className="divide-y divide-border text-sm">
        {facts.map((f) => (
          <li key={f.id} className="py-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-foreground">{f.text}</p>
              <p className="text-xs text-muted-foreground">{name(f.dimension_id)}{f.geoid ? ` · place ${f.geoid}` : " · everywhere"} · <a href={f.source_url} target="_blank" rel="noreferrer" className="underline">source</a></p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => toggle(f.id, f.active)}>{f.active ? "Turn off" : "Turn on"}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
