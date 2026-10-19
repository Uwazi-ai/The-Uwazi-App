import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Plus, Save, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

type Event = { id: string; slug: string; label: string; active: boolean; starts_at: string; expires_at: string };
type Total = { event_id: string; persona_key: string };
function EventRow({ event, results, refresh, onDirty }: { event: Event; results: Total[]; refresh: () => void; onDirty: (id: string, value: boolean) => void }) {
  const [label, setLabel] = useState(event.label);
  const [expiry, setExpiry] = useState(event.expires_at.slice(0, 16));
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const link = `${window.location.origin}/compass/demo/${event.slug}`;
  const dirty = label !== event.label || expiry !== event.expires_at.slice(0, 16);
  useEffect(() => { onDirty(event.id, dirty); }, [dirty, event.id, onDirty]);
  useEffect(() => { QRCode.toDataURL(link, { width: 180, margin: 2 }).then(setQr); }, [link]);
  const save = async (values: { label?: string; expires_at?: string; active?: boolean }) => {
    setBusy(true);
    const { error } = await supabase.from("compass_demo_events").update(values).eq("id", event.id);
    setBusy(false);
    if (error) { toast.error("We could not save this event."); return; }
    onDirty(event.id, false); refresh();
  };
  const distribution = results.reduce<Record<string, number>>((counts, result) => ({ ...counts, [result.persona_key]: (counts[result.persona_key] ?? 0) + 1 }), {});
  return <article className="border-t border-border pt-5 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-heading text-lg">{event.label}</h3><Button variant="outline" disabled={busy} onClick={() => void save({ active: !event.active })}><Power className="mr-2 size-4" />{event.active ? "Deactivate" : "Activate"}</Button></div>
    <p className="text-sm text-muted-foreground">{event.slug} · {event.active ? "Active" : "Inactive"} · {results.length} completions</p>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Event label<Input value={label} maxLength={200} onChange={e => setLabel(e.target.value)} /></label><label className="text-sm">Expiry (UTC)<Input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} /></label></div>
    <Button disabled={!dirty || busy || !label.trim() || !expiry} onClick={() => void save({ label: label.trim(), expires_at: new Date(`${expiry}Z`).toISOString() })}><Save className="mr-2 size-4" />Save changes</Button>
    <div className="flex flex-wrap items-center gap-4">{qr && <img src={qr} alt={`QR code for ${event.label}`} width={180} height={180} />}<div className="min-w-0 flex-1 space-y-2"><a className="block break-all text-sm text-primary underline" href={link}>{link}</a><Button variant="outline" onClick={() => void navigator.clipboard.writeText(link).then(() => toast.success("Demo link copied."))}><Copy className="mr-2 size-4" />Copy demo link</Button><ul className="text-sm">{Object.entries(distribution).map(([key, count]) => <li key={key}>{key}: {count}</li>)}</ul></div></div>
  </article>;
}

export function CompassDemoEvents({ onDirtyChange }: { onDirtyChange?: (value: boolean) => void }) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [results, setResults] = useState<Total[]>([]);
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState(false);
  const [dirtyRows, setDirtyRows] = useState<Record<string, boolean>>({});
  const refresh = async () => {
    const [eventRows, resultRows] = await Promise.all([
      supabase.from("compass_demo_events").select("id,slug,label,active,starts_at,expires_at").order("created_at", { ascending: false }),
      // Page aggregate-only fields so totals do not silently stop at 1000.
      (async () => { const all: Total[] = []; for (let offset = 0; ; offset += 1000) { const { data, error } = await supabase.from("compass_demo_results").select("event_id,persona_key").order("id").range(offset, offset + 999); if (error) return { data: null, error }; all.push(...data); if (data.length < 1000) return { data: all, error: null }; } })(),
    ]);
    setError(Boolean(eventRows.error || resultRows.error));
    if (eventRows.data) setEvents(eventRows.data);
    if (resultRows.data) setResults(resultRows.data);
  };
  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }).then(({ data }) => { setAllowed(data === true); if (data) void refresh(); });
  }, [user]);
  useEffect(() => { onDirtyChange?.(Boolean(slug || label || expiry) || Object.values(dirtyRows).some(Boolean)); }, [slug, label, expiry, dirtyRows, onDirtyChange]);
  const create = async () => {
    const { error } = await supabase.from("compass_demo_events").insert({ slug, label: label.trim(), starts_at: new Date().toISOString(), expires_at: new Date(`${expiry}Z`).toISOString(), active: false });
    if (error) { toast.error("We could not create the event. Check its link name and expiry."); return; }
    setSlug(""); setLabel(""); setExpiry(""); void refresh();
  };
  if (!allowed) return <p className="text-sm text-muted-foreground">Compass Demo Events is for super admins.</p>;
  return <Card className="rounded-lg p-5 space-y-4"><h2 className="font-heading text-xl">Compass Demo Events</h2><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Link name<Input placeholder="expo-oct-19" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /></label><label className="text-sm">Label<Input value={label} maxLength={200} onChange={e => setLabel(e.target.value)} /></label><label className="text-sm">Expiry (UTC)<Input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} /></label></div><Button disabled={!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !label.trim() || !expiry} onClick={() => void create()}><Plus className="mr-2 size-4" />Create event</Button>{error && <p role="alert">We could not load event totals.</p>}{events.map(event => <EventRow key={`${event.id}:${event.label}:${event.expires_at}`} event={event} results={results.filter(result => result.event_id === event.id)} refresh={() => void refresh()} onDirty={(id, value) => setDirtyRows(previous => previous[id] === value ? previous : { ...previous, [id]: value })} />)}</Card>;
}