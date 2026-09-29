import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trophy, RefreshCw } from "lucide-react";

const db = supabase as any;

const COUNTS = [
  { v: "lessons_completed", l: "Lessons finished" },
  { v: "compass_taken", l: "Compass quizzes taken" },
  { v: "surveys_answered", l: "Surveys answered" },
  { v: "actions_logged", l: "Civic actions logged" },
];

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  counts_what: string;
  scope: string;
  starts_at: string;
  ends_at: string;
  badge_id: string | null;
  active: boolean;
  ended_at: string | null;
  winning_zip: string | null;
}

interface BoardRow {
  zip_code: string;
  participants: number;
  total_count: number;
  eligible: number;
  participation_rate: number;
  shown: boolean;
}

function Board({ id }: { id: string }) {
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    await db.rpc("refresh_challenge_progress", { _challenge: id });
    const { data } = await db.rpc("challenge_zip_board_admin", { _challenge: id });
    setRows(data ?? []);
    setBusy(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-foreground">ZIP board</h4>
        <Button size="sm" variant="ghost" onClick={load} disabled={busy}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one has taken part yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-3">ZIP</th>
                <th className="py-1 pr-3">Took part</th>
                <th className="py-1 pr-3">Share</th>
                <th className="py-1 pr-3">Total</th>
                <th className="py-1">Shown to users</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.zip_code} className="border-t border-border">
                  <td className="py-1 pr-3 font-semibold text-foreground">{r.zip_code}</td>
                  <td className="py-1 pr-3">{r.participants} of {r.eligible}</td>
                  <td className="py-1 pr-3">{Math.round(Number(r.participation_rate) * 100)} out of 100</td>
                  <td className="py-1 pr-3">{r.total_count}</td>
                  <td className="py-1">{r.shown ? "Yes" : "No, under 10 people"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminChallengesPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Challenge[]>([]);
  const [badges, setBadges] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    counts_what: "lessons_completed",
    scope: "zip",
    starts_at: new Date().toISOString().slice(0, 10),
    ends_at: "",
    badge_id: "",
  });

  const load = useCallback(async () => {
    const [{ data: cs }, { data: bs }] = await Promise.all([
      db.from("challenges").select("*").order("created_at", { ascending: false }),
      db.from("badges").select("id, name").order("name"),
    ]);
    setList(cs ?? []);
    setBadges(bs ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.title.trim() || !form.ends_at) return toast.error("Add a title and an end date.");
    const { error } = await db.from("challenges").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      counts_what: form.counts_what,
      scope: form.scope,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(`${form.ends_at}T23:59:59`).toISOString(),
      badge_id: form.badge_id || null,
      created_by: user?.id ?? null,
    });
    if (error) return toast.error("We could not save that challenge. Try again.");
    toast.success("Challenge saved.");
    setForm({ ...form, title: "", description: "", ends_at: "", badge_id: "" });
    load();
  };

  const save = async (c: Challenge, patch: Partial<Challenge>) => {
    const { error } = await db.from("challenges").update(patch).eq("id", c.id);
    if (error) return toast.error("We could not save that change. Try again.");
    toast.success("Saved.");
    load();
  };

  const end = async (c: Challenge) => {
    const zip = window.prompt("Which ZIP won? Type the ZIP code from the board.");
    if (!zip) return;
    const { data, error } = await db.rpc("end_challenge", { _challenge: c.id, _zip: zip.trim() });
    if (error) return toast.error("We could not end that challenge. Try again.");
    toast.success(`Challenge ended. ${data?.winners ?? 0} people earned the winner badge.`);
    load();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6 overflow-x-hidden">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="font-heading text-2xl text-foreground">Civic Games</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Run a friendly ZIP contest. The board shows ZIP codes only. No one is ever shown by name.
      </p>

      <div className="rounded-2xl p-5 bg-card border border-border space-y-3">
        <h2 className="font-semibold text-foreground">New challenge</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Learn Your City Week" />
          </div>
          <div className="space-y-1">
            <Label>What it counts</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.counts_what} onChange={(e) => setForm({ ...form, counts_what: e.target.value })}>
              {COUNTS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Starts</Label>
            <Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Ends</Label>
            <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Scope</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              <option value="zip">ZIP code</option>
              <option value="city">City</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Badge to award</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.badge_id} onChange={(e) => setForm({ ...form, badge_id: e.target.value })}>
              <option value="">No badge</option>
              {badges.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Short description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Finish lessons this week and lift your ZIP." />
        </div>
        <Button onClick={create}>Create challenge</Button>
      </div>

      {loading ? (
        <div className="h-24 rounded-2xl bg-card animate-pulse" />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No challenges yet. Create the first one above.</p>
      ) : (
        list.map((c) => (
          <div key={c.id} className="rounded-2xl p-5 bg-card border border-border space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">{c.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {COUNTS.find((x) => x.v === c.counts_what)?.l} · {new Date(c.starts_at).toLocaleDateString()} to {new Date(c.ends_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.ended_at ? `Ended. ${c.winning_zip ?? "No"} ZIP won.` : c.active ? "Live now" : "Turned off"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!c.ended_at && (
                  <Button size="sm" variant="outline" onClick={() => save(c, { active: !c.active })}>
                    {c.active ? "Turn off" : "Turn on"}
                  </Button>
                )}
                {!c.ended_at && <Button size="sm" onClick={() => end(c)}>End and pick winner</Button>}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input defaultValue={c.title} onBlur={(e) => e.target.value !== c.title && save(c, { title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Ends</Label>
                <Input type="date" defaultValue={c.ends_at.slice(0, 10)} onBlur={(e) => e.target.value && save(c, { ends_at: new Date(`${e.target.value}T23:59:59`).toISOString() })} />
              </div>
            </div>
            <Board id={c.id} />
          </div>
        ))
      )}
      <p className="text-sm text-muted-foreground">Next step: open the board and check that a ZIP has 10 people before you pick a winner.</p>
    </div>
  );
}
