import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Plus, ShieldCheck, ShieldAlert, BookOpen, Lock } from "lucide-react";
import { toast } from "sonner";

type Phase = "P0" | "30" | "60" | "90";
type Status = "not_started" | "in_progress" | "done" | "blocked";
type Severity = "low" | "medium" | "high" | "critical";
type IncidentStatus = "open" | "contained" | "resolved";

interface SecurityTask {
  id: string;
  phase: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  owner: string | null;
  due_date: string | null;
  notes: string | null;
  sort_order: number | null;
}

interface SecurityIncident {
  id: string;
  title: string;
  severity: string;
  status: string;
  description: string | null;
  detected_at: string;
  resolved_at: string | null;
}

const PHASE_LABELS: Record<Phase, string> = {
  P0: "P0 — Critical",
  "30": "30-day",
  "60": "60-day",
  "90": "90-day",
};

const STATUS_LABELS: Record<Status, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

const STATUS_NEXT: Record<Status, Status> = {
  not_started: "in_progress",
  in_progress: "done",
  done: "not_started",
  blocked: "not_started",
};

const statusColor = (s: string) => {
  switch (s) {
    case "done": return "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30";
    case "in_progress": return "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30";
    case "blocked": return "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const severityColor = (s: string) => {
  switch (s) {
    case "critical": return "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30";
    case "high": return "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30";
    case "medium": return "bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const categoryColor = (c: string | null) => {
  const map: Record<string, string> = {
    RLS: "bg-[#2563EB]/15 text-[#2563EB]",
    Secrets: "bg-[#EF4444]/15 text-[#EF4444]",
    Twilio: "bg-[#F59E0B]/15 text-[#F59E0B]",
    Auth: "bg-[#22C55E]/15 text-[#22C55E]",
    AI: "bg-purple-500/15 text-purple-400",
    Infra: "bg-sky-500/15 text-sky-400",
    AppSec: "bg-[#2563EB]/15 text-[#2563EB]",
    Access: "bg-pink-500/15 text-pink-400",
    Data: "bg-emerald-500/15 text-emerald-400",
    Monitoring: "bg-cyan-500/15 text-cyan-400",
    "Supply Chain": "bg-orange-500/15 text-orange-400",
    Recovery: "bg-indigo-500/15 text-indigo-400",
    Governance: "bg-slate-500/15 text-slate-300",
  };
  return c && map[c] ? map[c] : "bg-muted text-muted-foreground";
};

const glass = "bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-lg";

export default function AdminSecurityPage() {
  const [tasks, setTasks] = useState<SecurityTask[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    const [t, i] = await Promise.all([
      supabase.from("security_tasks").select("*").order("sort_order", { ascending: true }),
      supabase.from("security_incidents").select("*").order("detected_at", { ascending: false }),
    ]);
    if (t.error) toast.error("Failed to load tasks"); else setTasks((t.data as SecurityTask[]) ?? []);
    if (i.error) toast.error("Failed to load incidents"); else setIncidents((i.data as SecurityIncident[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const ch = supabase.channel("sec-cc")
      .on("postgres_changes", { event: "*", schema: "public", table: "security_tasks" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "security_incidents" }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === "done").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const open = incidents.filter(i => i.status !== "resolved").length;
    const weekAhead = new Date(); weekAhead.setDate(weekAhead.getDate() + 7);
    const dueSoon = tasks.filter(t => t.due_date && new Date(t.due_date) <= weekAhead && t.status !== "done").length;
    return { total, done, pct, open, dueSoon };
  }, [tasks, incidents]);

  const byPhase = (p: Phase) => tasks.filter(t => t.phase === p);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[#2563EB]/15 border border-[#2563EB]/30 flex items-center justify-center">
            <Lock className="h-6 w-6 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Security Command Center</h1>
            <p className="text-sm text-muted-foreground">UWAZI.AI + Engage · Internal</p>
          </div>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab tasks={tasks} stats={stats} onChange={loadAll} loading={loading} />
          </TabsContent>
          <TabsContent value="tasks">
            <TasksTab tasks={tasks} onChange={loadAll} />
          </TabsContent>
          <TabsContent value="incidents">
            <IncidentsTab incidents={incidents} onChange={loadAll} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({
  tasks, stats, onChange, loading,
}: {
  tasks: SecurityTask[];
  stats: { total: number; done: number; pct: number; open: number; dueSoon: number };
  onChange: () => void;
  loading: boolean;
}) {
  const phases: Phase[] = ["P0", "30", "60", "90"];
  const p0 = tasks.filter(t => t.phase === "P0");
  const p0Done = p0.length > 0 && p0.every(t => t.status === "done");

  const toggleDone = async (t: SecurityTask) => {
    const next = t.status === "done" ? "not_started" : "done";
    const { error } = await supabase.from("security_tasks").update({ status: next }).eq("id", t.id);
    if (error) toast.error("Update failed"); else onChange();
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={loading ? "—" : stats.total} />
        <StatCard label="% Complete" value={loading ? "—" : `${stats.pct}%`} ring={stats.pct} />
        <StatCard label="Open Incidents" value={loading ? "—" : stats.open} accent="#EF4444" />
        <StatCard label="Due This Week" value={loading ? "—" : stats.dueSoon} accent="#F59E0B" />
      </div>

      {/* Phase progress */}
      <Card className={`${glass} p-6`}>
        <h2 className="text-lg font-semibold mb-4 text-foreground">Phase Progress</h2>
        <div className="space-y-4">
          {phases.map(p => {
            const items = tasks.filter(t => t.phase === p);
            const done = items.filter(t => t.status === "done").length;
            const pct = items.length ? Math.round((done / items.length) * 100) : 0;
            return (
              <div key={p}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground">{PHASE_LABELS[p]}</span>
                  <span className="text-muted-foreground">{done}/{items.length}</span>
                </div>
                <Progress value={pct} className="h-2 [&>div]:bg-[#2563EB]" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* P0 highlight */}
      <Card
        className={`${glass} p-6`}
        style={{
          borderLeft: p0Done ? "4px solid #22C55E" : "4px solid #EF4444",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            {p0Done ? <ShieldCheck className="h-5 w-5 text-[#22C55E]" /> : <ShieldAlert className="h-5 w-5 text-[#EF4444]" />}
            Priority 0 — Critical This Week
          </h2>
          {p0Done && <span className="text-sm text-[#22C55E] font-medium">✓ All clear</span>}
        </div>
        <div className="space-y-2">
          {p0.map(t => (
            <label
              key={t.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={t.status === "done"}
                onChange={() => toggleDone(t)}
                className="mt-1 h-4 w-4 rounded accent-[#2563EB]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${categoryColor(t.category)}`}>
                    {t.category}
                  </span>
                  <span className={`text-sm ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {t.title}
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent, ring }: { label: string; value: string | number; accent?: string; ring?: number }) {
  return (
    <Card className={`${glass} p-5`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold" style={{ color: accent ?? "#2563EB" }}>{value}</p>
        {ring !== undefined && (
          <svg className="h-12 w-12 -rotate-90">
            <circle cx="24" cy="24" r="20" stroke="hsl(var(--muted))" strokeWidth="3" fill="none" />
            <circle
              cx="24" cy="24" r="20"
              stroke="#2563EB"
              strokeWidth="3" fill="none"
              strokeDasharray={`${(ring / 100) * 125.6} 125.6`}
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </Card>
  );
}

/* ---------------- Tasks ---------------- */
function TasksTab({ tasks, onChange }: { tasks: SecurityTask[]; onChange: () => void }) {
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const categories = useMemo(() => Array.from(new Set(tasks.map(t => t.category).filter(Boolean))) as string[], [tasks]);

  const filtered = tasks.filter(t =>
    (phaseFilter === "all" || t.phase === phaseFilter) &&
    (statusFilter === "all" || t.status === statusFilter) &&
    (categoryFilter === "all" || t.category === categoryFilter)
  );

  const grouped: Record<string, SecurityTask[]> = {};
  for (const t of filtered) {
    (grouped[t.phase] ??= []).push(t);
  }

  return (
    <div className="space-y-4">
      <Card className={`${glass} p-4 flex flex-wrap gap-3 items-center justify-between`}>
        <div className="flex flex-wrap gap-2">
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Phase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              <SelectItem value="P0">P0</SelectItem>
              <SelectItem value="30">30-day</SelectItem>
              <SelectItem value="60">60-day</SelectItem>
              <SelectItem value="90">90-day</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <AddTaskDialog onSaved={onChange} />
      </Card>

      {Object.keys(grouped).sort().map(phase => (
        <div key={phase} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {PHASE_LABELS[phase as Phase] ?? phase}
          </h3>
          {grouped[phase].map(t => (
            <TaskRow key={t.id} task={t} onChange={onChange} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TaskRow({ task, onChange }: { task: SecurityTask; onChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(task.notes ?? "");

  useEffect(() => setNotes(task.notes ?? ""), [task.notes]);

  const cycleStatus = async () => {
    const next = STATUS_NEXT[task.status as Status] ?? "not_started";
    const { error } = await supabase.from("security_tasks").update({ status: next }).eq("id", task.id);
    if (error) toast.error("Update failed"); else onChange();
  };

  const setBlocked = async () => {
    const { error } = await supabase.from("security_tasks").update({ status: "blocked" }).eq("id", task.id);
    if (error) toast.error("Update failed"); else onChange();
  };

  const saveNotes = async () => {
    if (notes === (task.notes ?? "")) return;
    const { error } = await supabase.from("security_tasks").update({ notes }).eq("id", task.id);
    if (error) toast.error("Save failed"); else { toast.success("Notes saved"); onChange(); }
  };

  return (
    <Card className={`${glass} overflow-hidden`}>
      <div className="flex items-center gap-3 p-4">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${categoryColor(task.category)} shrink-0`}>
          {task.category}
        </span>
        <span className="flex-1 text-sm text-foreground">{task.title}</span>
        <span className="hidden md:inline text-xs text-muted-foreground">{task.owner ?? "—"}</span>
        <span className="hidden md:inline text-xs text-muted-foreground">{task.due_date ?? "—"}</span>
        <button
          onClick={cycleStatus}
          onContextMenu={(e) => { e.preventDefault(); setBlocked(); }}
          title="Click to cycle status · Right-click to mark blocked"
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${statusColor(task.status)}`}
        >
          {STATUS_LABELS[task.status as Status] ?? task.status}
        </button>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Expand"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
          {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add progress notes…"
              className="min-h-[80px]"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function AddTaskDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", phase: "P0", category: "AppSec",
    status: "not_started", owner: "", due_date: "", notes: "",
  });
  const submit = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    const { error } = await supabase.from("security_tasks").insert({
      ...form,
      due_date: form.due_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Task added");
    setOpen(false);
    setForm({ title: "", description: "", phase: "P0", category: "AppSec", status: "not_started", owner: "", due_date: "", notes: "" });
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white"><Plus className="h-4 w-4 mr-1" /> Add Task</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Security Task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.phase} onValueChange={(v) => setForm({ ...form, phase: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="P0">P0</SelectItem>
                <SelectItem value="30">30-day</SelectItem>
                <SelectItem value="60">60-day</SelectItem>
                <SelectItem value="90">90-day</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input placeholder="Owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Incidents ---------------- */
function IncidentsTab({ incidents, onChange }: { incidents: SecurityIncident[]; onChange: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const setStatus = async (i: SecurityIncident, status: IncidentStatus) => {
    const patch: Partial<SecurityIncident> = { status };
    if (status === "resolved") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("security_incidents").update(patch).eq("id", i.id);
    if (error) toast.error("Update failed"); else onChange();
  };

  return (
    <div className="space-y-4">
      <Card className={`${glass} p-4 flex justify-between items-center`}>
        <h2 className="font-semibold text-foreground">Security Incidents</h2>
        <LogIncidentDialog onSaved={onChange} />
      </Card>

      <Card className={`${glass} overflow-hidden`}>
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No incidents logged. Good news.</div>
        ) : (
          <div className="divide-y divide-white/5">
            <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold bg-white/[0.02]">
              <span className="col-span-4">Title</span>
              <span className="col-span-2">Severity</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2">Detected</span>
              <span className="col-span-2">Resolved</span>
            </div>
            {incidents.map(i => (
              <div key={i.id}>
                <button
                  onClick={() => setExpandedId(expandedId === i.id ? null : i.id)}
                  className="w-full grid grid-cols-12 gap-3 px-4 py-3 text-sm text-left hover:bg-white/[0.03] transition-colors items-center"
                >
                  <span className="col-span-4 font-medium text-foreground truncate">{i.title}</span>
                  <span className="col-span-2"><Badge variant="outline" className={severityColor(i.severity)}>{i.severity}</Badge></span>
                  <span className="col-span-2"><Badge variant="outline" className={statusColor(i.status === "resolved" ? "done" : i.status === "contained" ? "in_progress" : "blocked")}>{i.status}</Badge></span>
                  <span className="col-span-2 text-xs text-muted-foreground">{new Date(i.detected_at).toLocaleDateString()}</span>
                  <span className="col-span-2 text-xs text-muted-foreground">{i.resolved_at ? new Date(i.resolved_at).toLocaleDateString() : "—"}</span>
                </button>
                {expandedId === i.id && (
                  <div className="px-4 pb-4 pt-1 space-y-3">
                    {i.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{i.description}</p>}
                    {i.status !== "resolved" && (
                      <div className="flex gap-2">
                        {i.status === "open" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus(i, "contained")}>
                            Mark Contained
                          </Button>
                        )}
                        <Button size="sm" className="bg-[#22C55E] hover:bg-[#22C55E]/90 text-white" onClick={() => setStatus(i, "resolved")}>
                          Mark Resolved
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Runbook />
    </div>
  );
}

function LogIncidentDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", severity: "medium", description: "" });
  const submit = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    const { error } = await supabase.from("security_incidents").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Incident logged");
    setOpen(false);
    setForm({ title: "", severity: "medium", description: "" });
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"><Plus className="h-4 w-4 mr-1" /> Log Incident</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Log Security Incident</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Description, scope, what was seen…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white">Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const RUNBOOK = [
  ["Detect & Declare", "Anyone can call it; notify Myke + Dayveon immediately."],
  ["Contain", "Rotate relevant secrets, disable affected endpoint/key, revoke sessions."],
  ["Assess Scope", "What data, how many people, was opinion data involved."],
  ["Eradicate & Recover", "Patch root cause, restore from backup if needed."],
  ["Notify", "If PII breached, loop in Derek Beriet (legal counsel) immediately."],
  ["Post-mortem", "Blameless write-up within one week; feed fixes back into tasks."],
];

function Runbook() {
  const [open, setOpen] = useState(false);
  return (
    <Card className={`${glass}`}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors">
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-[#2563EB]" />
            Incident Response Runbook
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 border-t border-white/5">
          <ol className="space-y-3 pt-4">
            {RUNBOOK.map(([title, body], idx) => (
              <li key={title} className="flex gap-3">
                <span className="h-6 w-6 shrink-0 rounded-full bg-[#2563EB]/15 text-[#2563EB] text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground text-sm">{title}</p>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
