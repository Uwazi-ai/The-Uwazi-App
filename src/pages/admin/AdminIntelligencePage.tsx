import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AdminIntelligencePage() {
  const { data: raiaData, isLoading: raiaLoading } = useQuery({
    queryKey: ["admin-intel-raia"],
    queryFn: async () => {
      const { data } = await supabase.from("raia_scores").select("*").order("score", { ascending: false });
      return data || [];
    },
  });

  const { data: impact, isLoading: impactLoading } = useQuery({
    queryKey: ["admin-intel-impact"],
    queryFn: async () => {
      const [profiles, scores, plans, lessons] = await Promise.all([
        supabase.from("profiles").select("zip_code"),
        supabase.from("civic_scores").select("lessons_completed"),
        supabase.from("voting_plans").select("id", { count: "exact" }),
        supabase.from("raia_scores").select("zip_code, score"),
      ]);
      const uniqueZips = new Set((profiles.data || []).map(p => p.zip_code).filter(Boolean)).size;
      const totalLessons = (scores.data || []).reduce((s, c) => s + (c.lessons_completed || 0), 0);
      const estHours = Math.round((totalLessons * 5) / 60);
      const lowScoreZips = (lessons.data || []).filter(r => (r.score || 0) < 50);
      const totalUsers = (profiles.data || []).length;
      const underrepPct = totalUsers > 0
        ? Math.round((lowScoreZips.length / Math.max(1, (lessons.data || []).length)) * 100)
        : 0;

      return {
        uniqueZips,
        estHours,
        votersWithPlans: plans.count || 0,
        underrepPct,
        totalUsers,
      };
    },
  });

  const { data: cohorts } = useQuery({
    queryKey: ["admin-intel-cohorts"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, created_at");
      if (!profiles?.length) return [];
      const byMonth: Record<string, string[]> = {};
      profiles.forEach(p => {
        const m = p.created_at.slice(0, 7);
        if (!byMonth[m]) byMonth[m] = [];
        byMonth[m].push(p.user_id);
      });
      const { data: scores } = await supabase.from("civic_scores").select("user_id, civic_literacy_score, total_xp, lessons_completed");
      const scoreMap = new Map((scores || []).map(s => [s.user_id, s]));

      return Object.entries(byMonth).sort().map(([month, userIds]) => {
        const cohortScores = userIds.map(id => scoreMap.get(id)).filter(Boolean);
        const avgScore = cohortScores.length ? Math.round(cohortScores.reduce((s, c) => s + (c!.civic_literacy_score || 0), 0) / cohortScores.length) : 0;
        const avgXp = cohortScores.length ? Math.round(cohortScores.reduce((s, c) => s + (c!.total_xp || 0), 0) / cohortScores.length) : 0;
        return { month, users: userIds.length, avgScore, avgXp };
      });
    },
  });

  const copyReport = () => {
    if (!impact) return;
    const text = `UWAZI.AI Impact Report\n\n• Civic education hours: ${impact.estHours}\n• Communities reached: ${impact.uniqueZips} ZIP codes\n• Voters with plans: ${impact.votersWithPlans}\n• Users from underrepresented areas: ${impact.underrepPct}%\n• Total users: ${impact.totalUsers}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase font-axis">SUPER ADMIN</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-axis uppercase text-foreground">BUSINESS INTELLIGENCE</h1>
        <p className="text-muted-foreground mt-1">Strategic insights powering UWAZI's growth and impact</p>
      </div>

      {/* RAIA Scores */}
      <Card className="bg-card border-border p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-axis uppercase text-foreground">RAIA SCORE BY ZIP</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-2 font-medium">ZIP</th>
                <th className="p-2 font-medium">Score</th>
                <th className="p-2 font-medium">Voter Turnout</th>
                <th className="p-2 font-medium">Policy Awareness</th>
                <th className="p-2 font-medium">Trust</th>
              </tr>
            </thead>
            <tbody>
              {raiaLoading && <tr><td colSpan={5} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>}
              {raiaData?.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-primary/5">
                  <td className="p-2 text-primary font-mono">{r.zip_code}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-border rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full" style={{ width: `${r.score || 0}%` }} /></div>
                      <span className="text-foreground">{r.score || 0}</span>
                    </div>
                  </td>
                  <td className="p-2 text-muted-foreground">{r.voter_turnout_score || 0}</td>
                  <td className="p-2 text-muted-foreground">{r.policy_awareness_score || 0}</td>
                  <td className="p-2 text-muted-foreground">{r.trust_score || 0}</td>
                </tr>
              ))}
              {!raiaLoading && !raiaData?.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No RAIA score data yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cohort Analysis */}
      <Card className="bg-card border-border p-4">
        <h3 className="text-sm font-axis uppercase text-foreground mb-4">COHORT ANALYSIS</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-2 font-medium">Cohort</th>
                <th className="p-2 font-medium">Users</th>
                <th className="p-2 font-medium">Avg Score</th>
                <th className="p-2 font-medium">Avg XP</th>
              </tr>
            </thead>
            <tbody>
              {cohorts?.map(c => (
                <tr key={c.month} className="border-b border-border hover:bg-primary/5">
                  <td className="p-2 text-foreground">{c.month}</td>
                  <td className="p-2 text-muted-foreground">{c.users}</td>
                  <td className="p-2"><div className="flex items-center gap-2"><div className="w-12 bg-border rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full" style={{ width: `${c.avgScore}%` }} /></div>{c.avgScore}</div></td>
                  <td className="p-2 text-muted-foreground">{c.avgXp}</td>
                </tr>
              ))}
              {!cohorts?.length && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No cohort data yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Impact */}
      <Card className="bg-card border-border p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-axis uppercase text-foreground">IMPACT METRICS</h3>
          <Button size="sm" variant="outline" onClick={copyReport} className="text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> Copy for Grant Report
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {impactLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />) : [
            { label: "Civic Ed Hours", value: impact?.estHours },
            { label: "Communities Reached", value: impact?.uniqueZips },
            { label: "Voters with Plans", value: impact?.votersWithPlans },
            { label: "Underrepresented %", value: `${impact?.underrepPct}%` },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-lg bg-background border border-border">
              <p className="text-2xl font-axis text-primary">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
