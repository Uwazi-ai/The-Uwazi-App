import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Search, BookOpen, Users, TrendingUp, Download, Filter, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

const ranges = [
  { key: "7", label: "7 Days" },
  { key: "30", label: "30 Days" },
  { key: "90", label: "90 Days" },
  { key: "all", label: "All Time" },
];

const CATEGORY_COLORS: Record<string, string> = {
  voting: "#9bd34b",
  legislation: "#6366f1",
  local_gov: "#f59e0b",
  candidates: "#ef4444",
  rights: "#8b5cf6",
  policy: "#06b6d4",
  civic_process: "#ec4899",
  general: "#6b7280",
  other: "#475569",
};

const COMPLEXITY_COLORS = { beginner: "#9bd34b", intermediate: "#f59e0b", advanced: "#ef4444" };

const FILTER_OPTIONS = [
  "All", "No Lesson", "Beginner", "Intermediate", "Advanced",
  "Voting", "Legislation", "Local Gov", "Candidates",
];

interface QuestionRow {
  id: string;
  question_text: string;
  topic_category: string | null;
  sub_topic: string | null;
  complexity_level: string | null;
  intent_type: string | null;
  zip_code: string | null;
  state_code: string | null;
  has_matching_lesson: boolean | null;
  required_web_search: boolean | null;
  suggested_lesson_title: string | null;
  lesson_gap_priority: string | null;
  follow_up_count: number | null;
  created_at: string;
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("30");
  const [filter, setFilter] = useState("All");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionRow | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const daysBack = range === "all" ? 365 : parseInt(range);
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  // Existing engagement data
  const { data: engagement, isLoading } = useQuery({
    queryKey: ["admin-analytics-engagement", range],
    queryFn: async () => {
      const [profiles, sessions, plans, legislation, lessons] = await Promise.all([
        supabase.from("profiles").select("created_at, last_active, onboarding_complete"),
        supabase.from("ask_uwazi_sessions").select("created_at").gte("created_at", since),
        supabase.from("voting_plans").select("created_at").gte("created_at", since),
        supabase.from("saved_legislation").select("saved_at").gte("saved_at", since),
        supabase.from("user_lesson_progress").select("completed_at, status").gte("updated_at", since),
      ]);
      const allProfiles = profiles.data || [];
      const now = Date.now();
      const dau = allProfiles.filter(p => p.last_active && now - new Date(p.last_active).getTime() < 86400000).length;
      const wau = allProfiles.filter(p => p.last_active && now - new Date(p.last_active).getTime() < 7 * 86400000).length;
      const mau = allProfiles.filter(p => p.last_active && now - new Date(p.last_active).getTime() < 30 * 86400000).length;
      const totalSignups = allProfiles.length;
      const onboarded = allProfiles.filter(p => p.onboarding_complete).length;
      const lessonsData = lessons.data || [];
      const completed = lessonsData.filter(l => l.status === "completed").length;
      const started = lessonsData.length;
      const plansData = plans.data || [];
      const sessionsByDay: Record<string, number> = {};
      (sessions.data || []).forEach(s => {
        const d = (s.created_at || "").slice(0, 10);
        sessionsByDay[d] = (sessionsByDay[d] || 0) + 1;
      });
      const sessionChart = Object.entries(sessionsByDay).sort().slice(-14).map(([date, count]) => ({ date, count }));
      const plansByWeek: Record<string, number> = {};
      plansData.forEach(p => {
        const d = new Date(p.created_at);
        const week = `W${Math.ceil(d.getDate() / 7)}-${d.getMonth() + 1}`;
        plansByWeek[week] = (plansByWeek[week] || 0) + 1;
      });
      const planChart = Object.entries(plansByWeek).map(([week, count]) => ({ week, count }));
      return {
        dau, wau, mau, totalSignups, onboarded, completed, started, planChart, sessionChart,
        completionRate: started > 0 ? Math.round((completed / started) * 100) : 0,
        totalSessions: sessions.data?.length || 0,
        totalPlans: plansData.length,
        totalBills: legislation.data?.length || 0,
      };
    },
  });

  // Question Intelligence data
  const { data: questionData, isLoading: qLoading } = useQuery({
    queryKey: ["admin-question-intelligence", range],
    queryFn: async () => {
      const { data: questions, error } = await supabase
        .from("uwazi_question_log")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Question log query error:", error);
        return null;
      }

      const qs = (questions || []) as QuestionRow[];
      const totalQuestions = qs.length;
      const uniqueTopics = new Set(qs.map(q => q.sub_topic).filter(Boolean)).size;
      const lessonGaps = qs.filter(q => !q.has_matching_lesson).length;
      const uniqueUsers = new Set(qs.map(q => q.user_id).filter(Boolean)).size;
      const avgPerUser = uniqueUsers > 0 ? (totalQuestions / uniqueUsers).toFixed(1) : "0";

      // This week count
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const thisWeek = qs.filter(q => q.created_at >= weekAgo).length;

      // By category
      const byCat: Record<string, number> = {};
      qs.forEach(q => {
        const cat = q.topic_category || "other";
        byCat[cat] = (byCat[cat] || 0) + 1;
      });
      const categoryChart = Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value, pct: totalQuestions > 0 ? Math.round((value / totalQuestions) * 100) : 0 }));

      // By day (last 30 days)
      const byDay: Record<string, { total: number; noLesson: number }> = {};
      qs.forEach(q => {
        const d = q.created_at.slice(0, 10);
        if (!byDay[d]) byDay[d] = { total: 0, noLesson: 0 };
        byDay[d].total++;
        if (!q.has_matching_lesson) byDay[d].noLesson++;
      });
      const dailyChart = Object.entries(byDay).sort().slice(-30).map(([date, v]) => ({
        date, total: v.total, noLesson: v.noLesson,
      }));

      // Complexity distribution
      const byComplexity: Record<string, number> = {};
      qs.forEach(q => {
        const c = q.complexity_level || "beginner";
        byComplexity[c] = (byComplexity[c] || 0) + 1;
      });
      const complexityChart = Object.entries(byComplexity).map(([name, value]) => ({ name, value }));

      // Top ZIPs
      const byZip: Record<string, { count: number; topics: Record<string, number>; noLesson: number }> = {};
      qs.forEach(q => {
        if (!q.zip_code) return;
        if (!byZip[q.zip_code]) byZip[q.zip_code] = { count: 0, topics: {}, noLesson: 0 };
        byZip[q.zip_code].count++;
        const t = q.topic_category || "other";
        byZip[q.zip_code].topics[t] = (byZip[q.zip_code].topics[t] || 0) + 1;
        if (!q.has_matching_lesson) byZip[q.zip_code].noLesson++;
      });
      const topZips = Object.entries(byZip)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([zip, d]) => {
          const topTopic = Object.entries(d.topics).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
          return { zip, state: "", count: d.count, topTopic, gapPct: d.count > 0 ? Math.round((d.noLesson / d.count) * 100) : 0 };
        });

      // Lesson gap coverage
      const gapPct = totalQuestions > 0 ? Math.round((lessonGaps / totalQuestions) * 100) : 0;

      return { qs, totalQuestions, uniqueTopics, lessonGaps, avgPerUser, thisWeek, categoryChart, dailyChart, complexityChart, topZips, gapPct, uniqueUsers };
    },
  });

  // Filter questions for the table
  const filteredQuestions = useMemo(() => {
    if (!questionData?.qs) return [];
    let filtered = questionData.qs;
    if (categoryFilter) filtered = filtered.filter(q => q.topic_category === categoryFilter);
    switch (filter) {
      case "No Lesson": filtered = filtered.filter(q => !q.has_matching_lesson); break;
      case "Beginner": filtered = filtered.filter(q => q.complexity_level === "beginner"); break;
      case "Intermediate": filtered = filtered.filter(q => q.complexity_level === "intermediate"); break;
      case "Advanced": filtered = filtered.filter(q => q.complexity_level === "advanced"); break;
      case "Voting": filtered = filtered.filter(q => q.topic_category === "voting"); break;
      case "Legislation": filtered = filtered.filter(q => q.topic_category === "legislation"); break;
      case "Local Gov": filtered = filtered.filter(q => q.topic_category === "local_gov"); break;
      case "Candidates": filtered = filtered.filter(q => q.topic_category === "candidates"); break;
    }
    return filtered.slice(0, 100);
  }, [questionData, filter, categoryFilter]);

  const exportCSV = () => {
    if (!filteredQuestions.length) return;
    const headers = "Time,Question,Category,SubTopic,Complexity,ZIP,HasLesson,Intent\n";
    const rows = filteredQuestions.map(q =>
      `"${q.created_at}","${q.question_text.replace(/"/g, '""')}","${q.topic_category || ''}","${q.sub_topic || ''}","${q.complexity_level || ''}","${q.zip_code || ''}","${q.has_matching_lesson ? 'Yes' : 'No'}","${q.intent_type || ''}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `uwazi-questions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const funnelData = engagement ? [
    { stage: "Signed Up", value: engagement.totalSignups, pct: 100 },
    { stage: "Onboarded", value: engagement.onboarded, pct: engagement.totalSignups > 0 ? Math.round((engagement.onboarded / engagement.totalSignups) * 100) : 0 },
    { stage: "First Lesson", value: engagement.started, pct: engagement.totalSignups > 0 ? Math.round((engagement.started / engagement.totalSignups) * 100) : 0 },
    { stage: "Voting Plan", value: engagement.totalPlans, pct: engagement.totalSignups > 0 ? Math.round((engagement.totalPlans / engagement.totalSignups) * 100) : 0 },
  ] : [];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase font-axis">SUPER ADMIN</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-axis uppercase text-foreground">PLATFORM ANALYTICS</h1>
      </div>

      <div className="flex gap-1">
        {ranges.map(r => (
          <Button key={r.key} size="sm" variant={range === r.key ? "default" : "outline"} onClick={() => setRange(r.key)} className="text-xs">{r.label}</Button>
        ))}
      </div>

      {/* ═══ Engagement Stats ═══ */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "DAU", value: engagement?.dau },
          { label: "WAU", value: engagement?.wau },
          { label: "MAU", value: engagement?.mau },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border p-4 text-center">
            {isLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : <p className="text-3xl font-axis text-foreground">{s.value ?? 0}</p>}
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card border-border p-4">
          <h3 className="text-sm font-axis uppercase text-foreground mb-4">ASK UWAZI SESSIONS / DAY</h3>
          <div className="h-[220px]">
            {engagement?.sessionChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagement.sessionChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#161616", border: "1px solid #2A2A2A", color: "#fff" }} />
                  <Bar dataKey="count" fill="#9bd34b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full" />}
          </div>
        </Card>
        <Card className="bg-card border-border p-4">
          <h3 className="text-sm font-axis uppercase text-foreground mb-4">VOTING PLANS / WEEK</h3>
          <div className="h-[220px]">
            {engagement?.planChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagement.planChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="week" tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#161616", border: "1px solid #2A2A2A", color: "#fff" }} />
                  <Bar dataKey="count" fill="#9bd34b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full" />}
          </div>
        </Card>
      </div>

      {/* Funnel */}
      <Card className="bg-card border-border p-4">
        <h3 className="text-sm font-axis uppercase text-foreground mb-4">USER FUNNEL</h3>
        <div className="space-y-3">
          {funnelData.map(f => (
            <div key={f.stage}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground">{f.stage}</span>
                <span className="text-muted-foreground">{f.value} ({f.pct}%)</span>
              </div>
              <div className="w-full bg-border rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${f.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Lesson Completion Rate", value: `${engagement?.completionRate ?? 0}%` },
          { label: "Total Sessions", value: engagement?.totalSessions },
          { label: "Bills Tracked", value: engagement?.totalBills },
          { label: "Voting Plans", value: engagement?.totalPlans },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border p-4">
            <p className="text-2xl font-axis text-foreground">{s.value ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ ASK UWAZI QUESTION INTELLIGENCE ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="pt-6 border-t border-border">
        <div className="flex items-center gap-2 mb-6">
          <Search className="h-5 w-5 text-primary" />
          <h2 className="text-2xl md:text-3xl font-axis uppercase text-foreground">ASK UWAZI QUESTION INTELLIGENCE</h2>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {qLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />) : [
            { label: "Total Questions Asked", value: questionData?.totalQuestions ?? 0, sub: `+${questionData?.thisWeek ?? 0} this week`, color: "text-foreground" },
            { label: "Unique Topics Detected", value: questionData?.uniqueTopics ?? 0, sub: `across ${questionData?.categoryChart?.length ?? 0} categories`, color: "text-foreground" },
            { label: "Lesson Gap Score", value: questionData?.lessonGaps ?? 0, sub: "questions without a lesson", color: "text-amber-400" },
            { label: "Avg Questions / User", value: questionData?.avgPerUser ?? 0, sub: "session depth indicator", color: "text-foreground" },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border p-4">
              <p className={`text-3xl font-axis ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{s.sub}</p>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Questions by Category */}
          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-axis uppercase text-foreground mb-4">QUESTIONS BY CATEGORY</h3>
            <div className="h-[280px]">
              {questionData?.categoryChart ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={questionData.categoryChart} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis type="number" tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "#161616", border: "1px solid #2A2A2A", color: "#fff" }}
                      formatter={(value: number, _name: string, props: any) => [`${value} (${props.payload.pct}%)`, "Questions"]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer"
                      onClick={(data: any) => setCategoryFilter(data.name === categoryFilter ? null : data.name)}>
                      {questionData.categoryChart.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.name] || "#6b7280"}
                          opacity={categoryFilter && categoryFilter !== entry.name ? 0.3 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Skeleton className="h-full" />}
            </div>
            {categoryFilter && (
              <button onClick={() => setCategoryFilter(null)} className="text-xs text-primary flex items-center gap-1 mt-2">
                <X className="h-3 w-3" /> Clear filter: {categoryFilter}
              </button>
            )}
          </Card>

          {/* Question Volume Over Time */}
          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-axis uppercase text-foreground mb-1">QUESTION VOLUME OVER TIME</h3>
            {questionData && questionData.gapPct > 0 && (
              <p className="text-[10px] text-amber-400 mb-3">{questionData.gapPct}% of questions lack lesson coverage</p>
            )}
            <div className="h-[260px]">
              {questionData?.dailyChart ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={questionData.dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#161616", border: "1px solid #2A2A2A", color: "#fff" }} />
                    <Line type="monotone" dataKey="total" stroke="#9bd34b" strokeWidth={2} dot={false} name="Total" />
                    <Line type="monotone" dataKey="noLesson" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Without Lesson" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <Skeleton className="h-full" />}
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Complexity Distribution */}
          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-axis uppercase text-foreground mb-4">COMPLEXITY DISTRIBUTION</h3>
            <div className="h-[220px] flex items-center justify-center">
              {questionData?.complexityChart && questionData.complexityChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={questionData.complexityChart} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80} paddingAngle={4}>
                      {questionData.complexityChart.map((entry, i) => (
                        <Cell key={i} fill={COMPLEXITY_COLORS[entry.name as keyof typeof COMPLEXITY_COLORS] || "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#161616", border: "1px solid #2A2A2A", color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {questionData?.complexityChart?.map(c => (
                <div key={c.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ background: COMPLEXITY_COLORS[c.name as keyof typeof COMPLEXITY_COLORS] || "#6b7280" }} />
                  <span className="text-muted-foreground capitalize">{c.name}</span>
                  <span className="text-foreground font-medium">{c.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Top ZIP Codes */}
          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-axis uppercase text-foreground mb-4">TOP ZIP CODES ASKING</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-2 font-medium">ZIP</th>
                    <th className="p-2 font-medium">Questions</th>
                    <th className="p-2 font-medium">Top Topic</th>
                    <th className="p-2 font-medium">Gap %</th>
                  </tr>
                </thead>
                <tbody>
                  {questionData?.topZips?.map(z => (
                    <tr key={z.zip} className="border-b border-border hover:bg-primary/5">
                      <td className="p-2 text-primary font-mono">{z.zip}</td>
                      <td className="p-2 text-foreground">{z.count}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: CATEGORY_COLORS[z.topTopic] || "#6b7280", color: CATEGORY_COLORS[z.topTopic] || "#6b7280" }}>
                          {z.topTopic}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <span className={z.gapPct > 50 ? "text-amber-400" : "text-muted-foreground"}>{z.gapPct}%</span>
                      </td>
                    </tr>
                  ))}
                  {!questionData?.topZips?.length && (
                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No ZIP data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Live Question Feed */}
        <Card className="bg-card border-border p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-axis uppercase text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> LIVE QUESTION FEED
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 flex-wrap">
                {FILTER_OPTIONS.map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                      filter === f ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={exportCSV} className="text-xs gap-1.5 h-7">
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-2 font-medium">Time</th>
                  <th className="p-2 font-medium">Question</th>
                  <th className="p-2 font-medium">Category</th>
                  <th className="p-2 font-medium hidden md:table-cell">Topic</th>
                  <th className="p-2 font-medium hidden lg:table-cell">Complexity</th>
                  <th className="p-2 font-medium hidden lg:table-cell">ZIP</th>
                  <th className="p-2 font-medium">Lesson?</th>
                  <th className="p-2 font-medium hidden md:table-cell">Intent</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map(q => (
                  <tr key={q.id} className="border-b border-border hover:bg-primary/5 cursor-pointer"
                    onClick={() => setSelectedQuestion(q)}>
                    <td className="p-2 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(q.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </td>
                    <td className="p-2 text-foreground max-w-[200px] truncate">{q.question_text.substring(0, 60)}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-[10px]"
                        style={{ borderColor: CATEGORY_COLORS[q.topic_category || "other"] || "#6b7280", color: CATEGORY_COLORS[q.topic_category || "other"] || "#6b7280" }}>
                        {q.topic_category || "—"}
                      </Badge>
                    </td>
                    <td className="p-2 text-muted-foreground text-xs hidden md:table-cell">{q.sub_topic || "—"}</td>
                    <td className="p-2 text-xs hidden lg:table-cell capitalize">{q.complexity_level || "—"}</td>
                    <td className="p-2 text-xs text-muted-foreground font-mono hidden lg:table-cell">{q.zip_code || "—"}</td>
                    <td className="p-2 text-center">{q.has_matching_lesson ? <span className="text-primary">✓</span> : <span className="text-destructive">✗</span>}</td>
                    <td className="p-2 text-xs text-muted-foreground capitalize hidden md:table-cell">{q.intent_type || "—"}</td>
                  </tr>
                ))}
                {!filteredQuestions.length && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No questions logged yet. Questions will appear here as users interact with Ask Uwazi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Question Detail Modal */}
      <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-axis text-foreground">QUESTION DETAIL</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Full Question</p>
                <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">{selectedQuestion.question_text}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <Badge variant="outline" className="mt-1"
                    style={{ borderColor: CATEGORY_COLORS[selectedQuestion.topic_category || "other"], color: CATEGORY_COLORS[selectedQuestion.topic_category || "other"] }}>
                    {selectedQuestion.topic_category || "—"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Sub-topic</p>
                  <p className="text-foreground mt-1">{selectedQuestion.sub_topic || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Intent</p>
                  <p className="text-foreground mt-1 capitalize">{selectedQuestion.intent_type || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Complexity</p>
                  <p className="text-foreground mt-1 capitalize">{selectedQuestion.complexity_level || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ZIP / State</p>
                  <p className="text-foreground mt-1 font-mono">{selectedQuestion.zip_code || "—"} · {selectedQuestion.state_code || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Web Search Used</p>
                  <p className="text-foreground mt-1">{selectedQuestion.required_web_search ? "Yes 🌐" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Has Matching Lesson</p>
                  <p className={`mt-1 ${selectedQuestion.has_matching_lesson ? "text-primary" : "text-amber-400"}`}>
                    {selectedQuestion.has_matching_lesson ? "✓ Yes" : "✗ No — Gap detected"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Follow-ups</p>
                  <p className="text-foreground mt-1">{selectedQuestion.follow_up_count || 0}</p>
                </div>
              </div>
              {selectedQuestion.suggested_lesson_title && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-400 font-medium mb-1">💡 Suggested Lesson</p>
                  <p className="text-sm text-foreground">{selectedQuestion.suggested_lesson_title}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
