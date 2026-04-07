import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const ranges = [
  { key: "7", label: "7 Days" },
  { key: "30", label: "30 Days" },
  { key: "90", label: "90 Days" },
  { key: "all", label: "All Time" },
];

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("30");

  const daysBack = range === "all" ? 365 : parseInt(range);
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

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

      // Sessions per day
      const sessionsByDay: Record<string, number> = {};
      (sessions.data || []).forEach(s => {
        const d = (s.created_at || "").slice(0, 10);
        sessionsByDay[d] = (sessionsByDay[d] || 0) + 1;
      });
      const sessionChart = Object.entries(sessionsByDay).sort().slice(-14).map(([date, count]) => ({ date, count }));

      // Plans per week
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

      {/* Engagement */}
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
          {funnelData.map((f, i) => (
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
    </div>
  );
}
