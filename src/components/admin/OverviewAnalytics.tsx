import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Award, Brain, ChevronDown, ChevronUp, FileText, GraduationCap, MessageCircle, UserPlus, Users, Vote, Zap } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAdminStats, useSignupChart } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewAnalytics({ statsQuery, chartQuery }: {
  statsQuery: ReturnType<typeof useAdminStats>;
  chartQuery: ReturnType<typeof useSignupChart>;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: stats, isLoading, isError } = statsQuery;
  const main = [
    { label: "Total users", value: stats?.totalUsers, icon: Users, to: "/app/admin/users" },
    { label: "New signups in 7 days", value: stats?.newSignups7d, icon: UserPlus, to: "/app/admin/users" },
    { label: "Active today", value: stats?.activeToday, icon: Activity, to: "/app/admin/analytics" },
    { label: "Lessons completed", value: stats?.lessonsCompleted, icon: GraduationCap, to: "/app/admin/lessons" },
  ];
  const extra = [
    { label: "Average civic score", value: stats?.avgScore, icon: Brain, to: "/app/admin/analytics" },
    { label: "Total XP earned", value: stats?.totalXp, icon: Zap, to: "/app/admin/analytics" },
    { label: "Ask UWAZI sessions", value: stats?.totalSessions, icon: MessageCircle, to: "/app/admin/intelligence" },
    { label: "Bills tracked", value: stats?.totalBills, icon: FileText, to: "/app/admin/analytics" },
    { label: "Voting plans created", value: stats?.totalPlans, icon: Vote, to: "/app/admin/analytics" },
    { label: "Badges awarded", value: stats?.totalBadges, icon: Award, to: "/app/admin/analytics" },
  ];
  const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))", fontSize: 12 };
  const tick = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };
  return (
    <section aria-label="Overview analytics" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-axis text-foreground">Analytics</h2>
        <Button variant="ghost" size="sm" aria-expanded={expanded} aria-controls="extra-overview-metrics" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show fewer metrics" : "Show more metrics"}
          {expanded ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
        </Button>
      </div>
      {isError && <p role="alert" className="text-sm text-destructive">We could not load the numbers. Use Refresh to try again.</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {main.map((metric) => (
          <Card key={metric.label} className="rounded-lg border-border bg-card overflow-hidden">
            <Link to={metric.to} className="group block p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <div className="mb-3 flex items-center justify-between"><metric.icon className="h-4 w-4 text-primary" /><ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
              {isLoading ? <Skeleton className="h-9 w-16" /> : <p className="font-axis text-3xl text-foreground break-all">{isError ? "Unavailable" : metric.value?.toLocaleString() ?? "—"}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
            </Link>
          </Card>
        ))}
      </div>
      <div id="extra-overview-metrics" hidden={!expanded}>
        {expanded && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {extra.map((metric) => <Card key={metric.label} className="rounded-lg border-border bg-card">
            <Link to={metric.to} className="block p-3 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
              <metric.icon className="mb-2 h-4 w-4 text-primary" />
              {isLoading ? <Skeleton className="h-7 w-14" /> : <p className="font-axis text-xl text-foreground break-all">{isError ? "Unavailable" : metric.value?.toLocaleString() ?? "—"}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
            </Link>
          </Card>)}
        </div>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(["growth", "signups"] as const).map((kind) => <Card key={kind} className="min-w-0 rounded-lg border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">{kind === "growth" ? "User growth" : "Signups by day"}</h3>
            <span className="text-xs text-muted-foreground">{kind === "growth" ? "30 days" : "14 days"}</span>
          </div>
          <div className="h-[180px] min-w-0" role="img" aria-label={kind === "growth" ? "Total users over the last 30 days" : "Daily signups over the last 14 days"}>
            {chartQuery.isError ? <p role="alert" className="text-sm text-destructive">Chart unavailable. Use Refresh to try again.</p> : chartQuery.isLoading ? <Skeleton className="h-full w-full" /> : chartQuery.data ? (
              <ResponsiveContainer width="100%" height="100%">
                {kind === "growth" ? <LineChart data={chartQuery.data.cumulative} margin={{ left: -20, right: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={tick} tickFormatter={(v: string) => v.slice(5)} minTickGap={26} axisLine={false} tickLine={false} />
                  <YAxis tick={tick} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Line name="Total users" type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart> : <BarChart data={chartQuery.data.daily} margin={{ left: -20, right: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={tick} tickFormatter={(v: string) => v.slice(5)} minTickGap={26} axisLine={false} tickLine={false} />
                  <YAxis tick={tick} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar name="Signups" dataKey="signups" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>}
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No signup data yet.</p>}
          </div>
        </Card>)}
      </div>
    </section>
  );
}