import { useAdminStats, useRecentSignups, useTopScores, useZipBreakdown, useSignupChart } from "@/hooks/useAdminData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Shield, Users, UserPlus, Activity, Brain, Zap, GraduationCap, MessageCircle, FileText, Vote, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AdminAvatar } from "@/components/admin/AdminAvatar";

function formatTimeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading } = useAdminStats();
  const { data: recent } = useRecentSignups();
  const { data: topScores } = useTopScores();
  const { data: zips } = useZipBreakdown();
  const { data: chartData } = useSignupChart();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setLastUpdated(new Date()), 60000);
    return () => clearInterval(i);
  }, []);

  const topStats = [
    { label: "Total Users", value: stats?.totalUsers, icon: Users },
    { label: "New Signups (7d)", value: stats?.newSignups7d, icon: UserPlus },
    { label: "Active Today", value: stats?.activeToday, icon: Activity },
    { label: "Avg Civic Score", value: stats?.avgScore, icon: Brain },
    { label: "Total XP Earned", value: stats?.totalXp?.toLocaleString(), icon: Zap },
    { label: "Lessons Completed", value: stats?.lessonsCompleted, icon: GraduationCap },
  ];

  const secondStats = [
    { label: "Ask Uwazi Sessions", value: stats?.totalSessions, icon: MessageCircle },
    { label: "Bills Tracked", value: stats?.totalBills, icon: FileText },
    { label: "Voting Plans Created", value: stats?.totalPlans, icon: Vote },
    { label: "Badges Awarded", value: stats?.totalBadges, icon: Award },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase font-axis">SUPER ADMIN</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-axis uppercase text-foreground">COMMAND CENTER.</h1>
        <p className="text-muted-foreground mt-1">Real-time platform intelligence for UWAZI.AI</p>
        <p className="text-xs text-muted-foreground mt-1">Last updated: {lastUpdated.toLocaleTimeString()}</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {topStats.map((s) => (
          <Card key={s.label} className="bg-card border-border p-4">
            <s.icon className="h-4 w-4 text-primary mb-2" />
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <p className="text-2xl font-axis text-foreground">{s.value ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Second Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {secondStats.map((s) => (
          <Card key={s.label} className="bg-card border-border p-4">
            <s.icon className="h-4 w-4 text-primary mb-2" />
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <p className="text-2xl font-axis text-foreground">{s.value ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card border-border p-4">
          <h3 className="text-sm font-axis uppercase text-foreground mb-4">USER GROWTH</h3>
          <div className="h-[250px]">
            {chartData?.cumulative ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.cumulative}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#161616", border: "1px solid #2A2A2A", color: "#fff" }} />
                  <Line type="monotone" dataKey="total" stroke="#9bd34b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full w-full" />}
          </div>
        </Card>

        <Card className="bg-card border-border p-4">
          <h3 className="text-sm font-axis uppercase text-foreground mb-4">SIGNUPS BY DAY</h3>
          <div className="h-[250px]">
            {chartData?.daily ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#161616", border: "1px solid #2A2A2A", color: "#fff" }} />
                  <Bar dataKey="signups" fill="#9bd34b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full w-full" />}
          </div>
        </Card>
      </div>

      {/* Bottom Panels */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Recent Signups */}
        <Card className="bg-card border-border p-4">
          <h3 className="text-sm font-axis uppercase text-foreground mb-3">RECENT SIGNUPS</h3>
          <div className="space-y-2">
            {recent?.map((u) => (
              <div key={u.user_id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden">
                  <AdminAvatar src={u.avatar_url} fallback={u.display_name?.[0]?.toUpperCase() || "?"} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{u.display_name || "Unknown"}</p>
                  <p className="text-[10px] text-muted-foreground">{u.zip_code ? `📍 ${u.zip_code}` : ""} · {formatTimeAgo(u.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/admin/users" className="text-xs text-primary mt-3 inline-block hover:underline">View All Users →</Link>
        </Card>

        {/* Top Civic Scores */}
        <Card className="bg-card border-border p-4">
          <h3 className="text-sm font-axis uppercase text-foreground mb-3">TOP CIVIC SCORES</h3>
          <div className="space-y-2">
            {topScores?.map((s) => (
              <div key={s.rank} className="flex items-center gap-3 py-1">
                <span className="text-xs font-axis text-primary w-5">#{s.rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                  <div className="w-full bg-border rounded-full h-1.5 mt-1">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${s.score}%` }} />
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{s.xp} XP</span>
              </div>
            ))}
            {!topScores?.length && <p className="text-xs text-muted-foreground">No scores yet</p>}
          </div>
        </Card>

        {/* ZIP Breakdown */}
        <Card className="bg-card border-border p-4">
          <h3 className="text-sm font-axis uppercase text-foreground mb-3">ZIP CODE BREAKDOWN</h3>
          <div className="space-y-2">
            {zips?.map((z) => (
              <div key={z.zip} className="flex items-center gap-3 py-1">
                <span className="text-xs font-mono text-primary">{z.zip}</span>
                <div className="flex-1 bg-border rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, (z.count / (zips[0]?.count || 1)) * 100)}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{z.count}</span>
              </div>
            ))}
            {!zips?.length && <p className="text-xs text-muted-foreground">No ZIP data yet</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
