import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ClipboardList, Plus, Trash2, GripVertical, BarChart3, Globe, Users,
  CheckCircle2, MessageSquare, Star, ToggleLeft, ArrowUpDown, MapPin,
  Eye, Rocket, Save, Download, ChevronDown, ChevronUp,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice", icon: CheckCircle2 },
  { value: "single_choice", label: "Single Choice", icon: ToggleLeft },
  { value: "rating", label: "Rating Scale", icon: Star },
  { value: "text", label: "Text Response", icon: MessageSquare },
  { value: "yes_no", label: "Yes / No", icon: ToggleLeft },
  { value: "ranking", label: "Ranking", icon: ArrowUpDown },
  { value: "location_verify", label: "Location Verify", icon: MapPin },
];

interface SurveyQuestion {
  id: string;
  type: string;
  text: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  target_type: string | null;
  target_zip_codes: any;
  target_states: any;
  questions: any;
  show_in_app: boolean | null;
  send_via_push: boolean | null;
  send_via_email: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
  response_count: number | null;
  completion_rate: number | null;
  created_at: string | null;
}

const CHART_COLORS = ["#9bd34b", "#6bb82d", "#4a9e1c", "#3d8516", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [viewingResponses, setViewingResponses] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);

  // Builder state
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetZips, setTargetZips] = useState("");
  const [targetStates, setTargetStates] = useState<string[]>([]);
  const [showInApp, setShowInApp] = useState(true);
  const [sendViaPush, setSendViaPush] = useState(false);
  const [sendViaEmail, setSendViaEmail] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [builderStep, setBuilderStep] = useState(0);

  useEffect(() => { fetchSurveys(); }, []);

  const fetchSurveys = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("surveys")
      .select("*")
      .order("created_at", { ascending: false });
    setSurveys((data as Survey[]) || []);
    setLoading(false);
  };

  const openBuilder = (survey?: Survey) => {
    if (survey) {
      setEditingSurvey(survey);
      setTitle(survey.title);
      setDescription(survey.description || "");
      setTargetType(survey.target_type || "all");
      setTargetZips(Array.isArray(survey.target_zip_codes) ? (survey.target_zip_codes as string[]).join(", ") : "");
      setTargetStates(Array.isArray(survey.target_states) ? survey.target_states as string[] : []);
      setShowInApp(survey.show_in_app ?? true);
      setSendViaPush(survey.send_via_push ?? false);
      setSendViaEmail(survey.send_via_email ?? false);
      setStartsAt(survey.starts_at ? survey.starts_at.slice(0, 16) : "");
      setEndsAt(survey.ends_at ? survey.ends_at.slice(0, 16) : "");
      setQuestions(Array.isArray(survey.questions) ? survey.questions as SurveyQuestion[] : []);
    } else {
      setEditingSurvey(null);
      setTitle(""); setDescription(""); setTargetType("all"); setTargetZips("");
      setTargetStates([]); setShowInApp(true); setSendViaPush(false);
      setSendViaEmail(false); setStartsAt(""); setEndsAt("");
      setQuestions([]);
    }
    setBuilderStep(0);
    setBuilderOpen(true);
  };

  const addQuestion = (type: string) => {
    setQuestions([...questions, {
      id: crypto.randomUUID(),
      type,
      text: "",
      required: true,
      options: ["multiple_choice", "single_choice", "ranking"].includes(type) ? ["Option 1", "Option 2"] : undefined,
      min: type === "rating" ? 1 : undefined,
      max: type === "rating" ? 10 : undefined,
    }]);
  };

  const updateQuestion = (idx: number, updates: Partial<SurveyQuestion>) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, ...updates } : q));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const arr = [...questions];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setQuestions(arr);
  };

  const saveSurvey = async (status: string) => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    const payload: any = {
      title, description, status,
      target_type: targetType,
      target_zip_codes: targetZips ? targetZips.split(",").map(z => z.trim()).filter(Boolean) : [],
      target_states: targetStates,
      show_in_app: showInApp,
      send_via_push: sendViaPush,
      send_via_email: sendViaEmail,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      questions,
    };

    if (editingSurvey) {
      await supabase.from("surveys").update(payload).eq("id", editingSurvey.id);
      toast.success("Survey updated");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;
      await supabase.from("surveys").insert(payload);
      toast.success("Survey created");
    }
    setBuilderOpen(false);
    fetchSurveys();
  };

  const deleteSurvey = async (id: string) => {
    await supabase.from("surveys").delete().eq("id", id);
    toast.success("Survey deleted");
    fetchSurveys();
  };

  const viewResponses = async (surveyId: string) => {
    setViewingResponses(surveyId);
    const { data } = await supabase
      .from("survey_responses")
      .select("*")
      .eq("survey_id", surveyId)
      .order("completed_at", { ascending: false });
    setResponses(data || []);
  };

  const survey = viewingResponses ? surveys.find(s => s.id === viewingResponses) : null;

  const statusColor = (s: string | null) => {
    switch (s) {
      case "active": return "bg-primary/15 text-primary";
      case "draft": return "bg-muted text-muted-foreground";
      case "paused": return "bg-amber-500/15 text-amber-500";
      case "closed": return "bg-destructive/15 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const activeCount = surveys.filter(s => s.status === "active").length;
  const totalResponses = surveys.reduce((a, s) => a + (s.response_count || 0), 0);

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-axis tracking-[0.2em] text-primary uppercase">SUPER ADMIN</p>
          <h1 className="text-2xl font-axis font-bold text-foreground tracking-tight">Survey Builder</h1>
          <p className="text-sm text-muted-foreground">Create geo-targeted surveys for civic field research</p>
        </div>
        <Button onClick={() => openBuilder()} className="gap-2">
          <Plus className="h-4 w-4" /> New Survey
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Surveys", value: activeCount, icon: ClipboardList, color: "text-primary" },
          { label: "Total Responses", value: totalResponses, icon: Users, color: "text-primary" },
          { label: "Avg Completion", value: surveys.length ? `${Math.round(surveys.reduce((a, s) => a + Number(s.completion_rate || 0), 0) / surveys.length)}%` : "—", icon: BarChart3, color: "text-primary" },
        ].map(s => (
          <Card key={s.label} className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Survey List */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Surveys</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No surveys yet. Create your first one!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs">
                    <th className="text-left py-2 font-medium">Title</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Target</th>
                    <th className="text-right py-2 font-medium">Responses</th>
                    <th className="text-right py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map(s => (
                    <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-medium text-foreground">{s.title}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(s.status)}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {s.target_type === "all" ? "All Users" :
                          s.target_type === "zip_codes" ? `${(s.target_zip_codes as any[])?.length || 0} ZIPs` :
                          `${(s.target_states as any[])?.length || 0} States`}
                      </td>
                      <td className="py-3 text-right text-foreground">{s.response_count || 0}</td>
                      <td className="py-3 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => viewResponses(s.id)}>
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openBuilder(s)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSurvey(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ======= SURVEY BUILDER DIALOG ======= */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSurvey ? "Edit Survey" : "Create Survey"}</DialogTitle>
            <DialogDescription>Build and target your survey in a few steps.</DialogDescription>
          </DialogHeader>

          <Tabs value={String(builderStep)} onValueChange={v => setBuilderStep(Number(v))}>
            <TabsList className="w-full">
              <TabsTrigger value="0" className="flex-1 text-xs">Setup</TabsTrigger>
              <TabsTrigger value="1" className="flex-1 text-xs">Targeting</TabsTrigger>
              <TabsTrigger value="2" className="flex-1 text-xs">Distribution</TabsTrigger>
              <TabsTrigger value="3" className="flex-1 text-xs">Questions</TabsTrigger>
              <TabsTrigger value="4" className="flex-1 text-xs">Preview</TabsTrigger>
            </TabsList>

            {/* Step 0: Setup */}
            <TabsContent value="0" className="space-y-4 mt-4">
              <div>
                <Label>Survey Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Community Civic Priorities 2026" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Shown to users before they start" rows={3} />
              </div>
            </TabsContent>

            {/* Step 1: Targeting */}
            <TabsContent value="1" className="space-y-4 mt-4">
              <div>
                <Label>Target Audience</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="zip_codes">By ZIP Code</SelectItem>
                    <SelectItem value="states">By State</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {targetType === "zip_codes" && (
                <div>
                  <Label>ZIP Codes (comma-separated)</Label>
                  <Input value={targetZips} onChange={e => setTargetZips(e.target.value)} placeholder="64139, 10001, 90210" />
                </div>
              )}
              {targetType === "states" && (
                <div>
                  <Label>States</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {US_STATES.map(st => (
                      <button
                        key={st}
                        onClick={() => setTargetStates(prev => prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st])}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                          targetStates.includes(st)
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted"
                        }`}
                      >{st}</button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Step 2: Distribution */}
            <TabsContent value="2" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show in app</Label>
                  <p className="text-xs text-muted-foreground">Display as a card on user dashboard</p>
                </div>
                <Switch checked={showInApp} onCheckedChange={setShowInApp} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Send push notification</Label>
                  <p className="text-xs text-muted-foreground">Notify via PWA push</p>
                </div>
                <Switch checked={sendViaPush} onCheckedChange={setSendViaPush} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Send email notification</Label>
                  <p className="text-xs text-muted-foreground">Email survey link</p>
                </div>
                <Switch checked={sendViaEmail} onCheckedChange={setSendViaEmail} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* Step 3: Questions */}
            <TabsContent value="3" className="space-y-4 mt-4">
              {questions.map((q, idx) => (
                <Card key={q.id} className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveQuestion(idx, -1)} className="text-muted-foreground hover:text-foreground"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button onClick={() => moveQuestion(idx, 1)} className="text-muted-foreground hover:text-foreground"><ChevronDown className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium w-6">Q{idx + 1}</span>
                      <Badge variant="outline" className="text-[10px]">{QUESTION_TYPES.find(t => t.value === q.type)?.label}</Badge>
                      <div className="flex-1" />
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Required</span>
                        <Switch checked={q.required} onCheckedChange={v => updateQuestion(idx, { required: v })} />
                      </div>
                      <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => removeQuestion(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      value={q.text}
                      onChange={e => updateQuestion(idx, { text: e.target.value })}
                      placeholder="Enter your question…"
                      className="font-medium"
                    />
                    {q.options && (
                      <div className="space-y-1.5 pl-6">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full border border-border/50" />
                            <Input
                              value={opt}
                              onChange={e => {
                                const newOpts = [...q.options!];
                                newOpts[oi] = e.target.value;
                                updateQuestion(idx, { options: newOpts });
                              }}
                              className="h-8 text-sm"
                            />
                            {q.options!.length > 2 && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => {
                                updateQuestion(idx, { options: q.options!.filter((_, i) => i !== oi) });
                              }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => {
                          updateQuestion(idx, { options: [...q.options!, `Option ${q.options!.length + 1}`] });
                        }}>
                          <Plus className="h-3 w-3 mr-1" /> Add Option
                        </Button>
                      </div>
                    )}
                    {q.type === "rating" && (
                      <div className="flex items-center gap-3 pl-6 text-sm text-muted-foreground">
                        <span>Scale:</span>
                        <Input type="number" value={q.min} onChange={e => updateQuestion(idx, { min: Number(e.target.value) })} className="w-16 h-8" />
                        <span>to</span>
                        <Input type="number" value={q.max} onChange={e => updateQuestion(idx, { max: Number(e.target.value) })} className="w-16 h-8" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map(qt => (
                  <Button key={qt.value} variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => addQuestion(qt.value)}>
                    <qt.icon className="h-3.5 w-3.5" /> {qt.label}
                  </Button>
                ))}
              </div>
            </TabsContent>

            {/* Step 4: Preview */}
            <TabsContent value="4" className="mt-4 space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-5 space-y-4">
                  <h3 className="text-lg font-bold text-foreground">{title || "Untitled Survey"}</h3>
                  {description && <p className="text-sm text-muted-foreground">{description}</p>}
                  {questions.map((q, idx) => (
                    <div key={q.id} className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {idx + 1}. {q.text || "Untitled question"} {q.required && <span className="text-destructive">*</span>}
                      </p>
                      {q.options && q.options.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-2 pl-4 text-sm text-muted-foreground">
                          <div className="h-3 w-3 rounded-full border border-border" /> {o}
                        </div>
                      ))}
                      {q.type === "rating" && (
                        <p className="pl-4 text-xs text-muted-foreground">Scale {q.min}–{q.max}</p>
                      )}
                      {q.type === "text" && (
                        <div className="pl-4"><div className="h-16 rounded border border-border/50 bg-muted/30" /></div>
                      )}
                      {q.type === "yes_no" && (
                        <div className="flex gap-3 pl-4">
                          <Badge variant="outline">Yes</Badge>
                          <Badge variant="outline">No</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="text-xs text-muted-foreground">
                Target: {targetType === "all" ? "All users" : targetType === "zip_codes" ? `ZIPs: ${targetZips}` : `States: ${targetStates.join(", ")}`}
                {" · "}{questions.length} question{questions.length !== 1 ? "s" : ""}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => saveSurvey("draft")}>
              <Save className="h-4 w-4 mr-1" /> Save Draft
            </Button>
            <Button onClick={() => saveSurvey("active")}>
              <Rocket className="h-4 w-4 mr-1" /> Launch Survey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======= RESPONSE VIEWER DIALOG ======= */}
      <Dialog open={!!viewingResponses} onOpenChange={() => setViewingResponses(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Responses — {survey?.title}</DialogTitle>
            <DialogDescription>{responses.length} total responses</DialogDescription>
          </DialogHeader>

          {survey && Array.isArray(survey.questions) && (survey.questions as SurveyQuestion[]).map((q, qi) => {
            const questionResponses = responses.map(r => {
              const answers = r.answers as Record<string, any>;
              return answers?.[q.id];
            }).filter(Boolean);

            return (
              <Card key={q.id} className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">Q{qi + 1}: {q.text}</p>

                  {(q.type === "multiple_choice" || q.type === "single_choice") && q.options && (
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={q.options.map(opt => ({
                          name: opt,
                          count: questionResponses.filter(r => Array.isArray(r) ? r.includes(opt) : r === opt).length,
                        }))}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#9bd34b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {q.type === "yes_no" && (() => {
                    const yes = questionResponses.filter(r => r === "yes" || r === true).length;
                    const no = questionResponses.length - yes;
                    const data = [{ name: "Yes", value: yes }, { name: "No", value: no }];
                    return (
                      <div className="h-32 flex items-center gap-6">
                        <ResponsiveContainer width={130} height="100%">
                          <PieChart>
                            <Pie data={data} dataKey="value" innerRadius={30} outerRadius={50}>
                              {data.map((_, i) => <Cell key={i} fill={i === 0 ? "#9bd34b" : "#ef4444"} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="text-sm space-y-1">
                          <p><span className="inline-block h-2 w-2 rounded-full bg-primary mr-1.5" />Yes: {yes}</p>
                          <p><span className="inline-block h-2 w-2 rounded-full bg-destructive mr-1.5" />No: {no}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {q.type === "rating" && (() => {
                  const avg = questionResponses.length
                      ? (questionResponses.reduce((a: number, v: any) => a + Number(v), 0) / questionResponses.length).toFixed(1)
                      : "—";
                    return <p className="text-lg font-bold text-primary">Average: {avg} <span className="text-xs text-muted-foreground font-normal">({questionResponses.length} responses)</span></p>;
                  })()}

                  {q.type === "text" && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {questionResponses.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No responses yet</p>
                      ) : questionResponses.map((r, i) => (
                        <p key={i} className="text-xs text-foreground bg-muted/30 rounded p-2">{String(r)}</p>
                      ))}
                    </div>
                  )}

                  {questionResponses.length === 0 && !["text"].includes(q.type) && (
                    <p className="text-xs text-muted-foreground">No responses yet</p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Geographic breakdown */}
          {responses.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" /> Geographic Breakdown
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(
                    responses.reduce((acc: Record<string, number>, r) => {
                      const zip = r.zip_code || "Unknown";
                      acc[zip] = (acc[zip] || 0) + 1;
                      return acc;
                    }, {})
                  ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([zip, count]) => (
                    <div key={zip} className="flex justify-between bg-muted/30 rounded px-2 py-1">
                      <span className="text-muted-foreground">{zip}</span>
                      <span className="font-medium text-foreground">{count as number}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => {
              const csv = ["Survey,Question,Answer,ZIP,State,Date",
                ...responses.flatMap(r => {
                  const answers = r.answers as Record<string, any>;
                  return Object.entries(answers).map(([qId, ans]) => {
                    const q = (survey?.questions as SurveyQuestion[])?.find(q => q.id === qId);
                    return `"${survey?.title}","${q?.text || qId}","${String(ans)}","${r.zip_code || ""}","${r.state_code || ""}","${r.completed_at}"`;
                  });
                })
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `survey-responses-${survey?.id}.csv`; a.click();
            }}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
