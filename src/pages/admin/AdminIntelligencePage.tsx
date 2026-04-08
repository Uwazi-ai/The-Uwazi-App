import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Download, Lightbulb, BookOpen, TrendingUp, AlertCircle, ChevronDown, ChevronRight, ExternalLink, Bug, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CATEGORY_COLORS: Record<string, string> = {
  voting: "#9bd34b", legislation: "#6366f1", local_gov: "#f59e0b",
  candidates: "#ef4444", rights: "#8b5cf6", policy: "#06b6d4",
  civic_process: "#ec4899", general: "#6b7280", other: "#475569",
};

function PriorityBadge({ score }: { score: number }) {
  if (score >= 10) return <span className="text-destructive font-medium">🔴 High</span>;
  if (score >= 5) return <span className="text-amber-400 font-medium">🟡 Medium</span>;
  return <span className="text-primary font-medium">🟢 Low</span>;
}

const ALL_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }, { code: "DC", name: "Washington DC" },
];

export default function AdminIntelligencePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});
  const [scrapeState, setScrapeState] = useState("MO");
  const [scrapeCity, setScrapeCity] = useState("Kansas City");
  const [scrapeType, setScrapeType] = useState("all");
  const [isRunning, setIsRunning] = useState(false);

  // ─── Existing data ───
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
      const underrepPct = totalUsers > 0 ? Math.round((lowScoreZips.length / Math.max(1, (lessons.data || []).length)) * 100) : 0;
      return { uniqueZips, estHours, votersWithPlans: plans.count || 0, underrepPct, totalUsers };
    },
  });

  const { data: cohorts } = useQuery({
    queryKey: ["admin-intel-cohorts"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, created_at");
      if (!profiles?.length) return [];
      const byMonth: Record<string, string[]> = {};
      profiles.forEach(p => { const m = p.created_at.slice(0, 7); if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(p.user_id); });
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

  // ─── Lesson Gap data ───
  const { data: gapData, isLoading: gapLoading } = useQuery({
    queryKey: ["admin-intel-lesson-gaps"],
    queryFn: async () => {
      const [recsRes, questionsRes] = await Promise.all([
        supabase.from("lesson_gap_recommendations").select("*").order("priority_score", { ascending: false }),
        supabase.from("uwazi_question_log").select("topic_category, sub_topic, complexity_level, zip_code, state_code, has_matching_lesson, created_at").order("created_at", { ascending: false }).limit(500),
      ]);

      const recs = recsRes.data || [];
      const questions = questionsRes.data || [];

      const pending = recs.filter(r => r.status === "pending").length;
      const inDev = recs.filter(r => r.status === "in_development").length;
      const published = recs.filter(r => r.status === "published").length;

      // Topic deep-dive
      const topicMap: Record<string, { count: number; subTopics: Record<string, number>; noLesson: number }> = {};
      questions.forEach(q => {
        const cat = q.topic_category || "other";
        if (!topicMap[cat]) topicMap[cat] = { count: 0, subTopics: {}, noLesson: 0 };
        topicMap[cat].count++;
        if (q.sub_topic) topicMap[cat].subTopics[q.sub_topic] = (topicMap[cat].subTopics[q.sub_topic] || 0) + 1;
        if (!q.has_matching_lesson) topicMap[cat].noLesson++;
      });

      const topicDeepDive = Object.entries(topicMap)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([topic, data]) => ({
          topic,
          count: data.count,
          noLesson: data.noLesson,
          subTopics: Object.entries(data.subTopics).sort((a, b) => b[1] - a[1]).slice(0, 5),
        }));

      // Research insights
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const thisWeekQs = questions.filter(q => q.created_at >= weekAgo);
      const lastWeekQs = questions.filter(q => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
        return q.created_at >= twoWeeksAgo && q.created_at < weekAgo;
      });

      // Trending topic
      const thisWeekTopics: Record<string, number> = {};
      thisWeekQs.forEach(q => {
        const t = q.sub_topic || q.topic_category || "general";
        thisWeekTopics[t] = (thisWeekTopics[t] || 0) + 1;
      });
      const trendingTopic = Object.entries(thisWeekTopics).sort((a, b) => b[1] - a[1])[0];
      const trendPct = lastWeekQs.length > 0 ? Math.round(((thisWeekQs.length - lastWeekQs.length) / lastWeekQs.length) * 100) : 0;

      // Top gap
      const topGap = recs.filter(r => r.status === "pending").sort((a, b) => (b.question_count || 0) - (a.question_count || 0))[0];

      // Geographic focus
      const stateMap: Record<string, { count: number; topTopic: string }> = {};
      questions.forEach(q => {
        if (!q.state_code) return;
        if (!stateMap[q.state_code]) stateMap[q.state_code] = { count: 0, topTopic: "" };
        stateMap[q.state_code].count++;
      });
      const topState = Object.entries(stateMap).sort((a, b) => b[1].count - a[1].count)[0];

      return { recs, pending, inDev, published, topicDeepDive, trendingTopic, trendPct, topGap, topState, totalQuestions: questions.length };
    },
  });

  // Update recommendation status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("lesson_gap_recommendations").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-intel-lesson-gaps"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const copyReport = () => {
    if (!impact) return;
    const text = `UWAZI.AI Impact Report\n\n• Civic education hours: ${impact.estHours}\n• Communities reached: ${impact.uniqueZips} ZIP codes\n• Voters with plans: ${impact.votersWithPlans}\n• Users from underrepresented areas: ${impact.underrepPct}%\n• Total users: ${impact.totalUsers}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // ─── Ballotpedia Scraper ───
  const { data: scraperLogs } = useQuery({
    queryKey: ["admin-scraper-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("ballotpedia_scraper_log").select("*").order("started_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: scrapedCandidates } = useQuery({
    queryKey: ["admin-scraped-candidates", scrapeState],
    queryFn: async () => {
      const { data } = await supabase.from("ballotpedia_candidates").select("*").eq("state_code", scrapeState).order("office").limit(50);
      return data || [];
    },
  });

  const triggerScraper = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("ballotpedia-scraper", {
        body: { state_code: scrapeState, city: scrapeCity, scrape_type: scrapeType, year: new Date().getFullYear() },
      });
      if (error) throw error;
      if (data?.success) {
        const r = data.results;
        toast.success(`Scraped: ${r.candidates} candidates, ${r.measures} measures, ${r.officials} officials, ${r.elections} elections`);
        queryClient.invalidateQueries({ queryKey: ["admin-scraper-logs"] });
        queryClient.invalidateQueries({ queryKey: ["admin-scraped-candidates"] });
      }
    } catch (err: any) {
      toast.error(`Scraper error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ LESSON GAP ENGINE ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="border-b border-border pb-8">
        <div className="flex items-center gap-2 mb-6">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-xl md:text-2xl font-axis uppercase text-foreground">LESSON GAP ENGINE</h2>
          <span className="text-xs text-muted-foreground ml-2">Powered by Ask Uwazi Research</span>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {gapLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />) : [
            { emoji: "🔴", label: "Lesson Gaps Identified", value: gapData?.pending ?? 0, sub: "topics users ask about with no lesson", color: "text-destructive" },
            { emoji: "🟡", label: "In Development", value: gapData?.inDev ?? 0, sub: "lessons being created", color: "text-amber-400" },
            { emoji: "🟢", label: "Gaps Closed", value: gapData?.published ?? 0, sub: "lessons created from research", color: "text-primary" },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border p-4 text-center">
              <p className="text-2xl mb-1">{s.emoji}</p>
              <p className={`text-3xl font-axis ${s.color}`}>{s.value}</p>
              <p className="text-xs text-foreground mt-1">{s.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
            </Card>
          ))}
        </div>

        {/* Research Insights Panel */}
        {gapData && gapData.totalQuestions > 0 && (
          <Card className="bg-primary/5 border-primary/20 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-axis text-primary uppercase tracking-wide">UWAZI RESEARCH INSIGHTS</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">Updated {new Date().toLocaleDateString()}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {gapData.trendingTopic && (
                <div className="flex items-start gap-2">
                  <span>🔥</span>
                  <p className="text-foreground">
                    <strong>Trending:</strong> "{gapData.trendingTopic[0]}" questions
                    {gapData.trendPct !== 0 && <span className={gapData.trendPct > 0 ? "text-primary" : "text-muted-foreground"}> ({gapData.trendPct > 0 ? "+" : ""}{gapData.trendPct}% this week)</span>}
                  </p>
                </div>
              )}
              {gapData.topGap && (
                <div className="flex items-start gap-2">
                  <span>📚</span>
                  <p className="text-foreground">
                    <strong>Biggest Gap:</strong> "{gapData.topGap.suggested_title}" requested {gapData.topGap.question_count} times with no lesson
                  </p>
                </div>
              )}
              {gapData.topState && (
                <div className="flex items-start gap-2">
                  <span>📍</span>
                  <p className="text-foreground">
                    <strong>Geographic Focus:</strong> Users in {gapData.topState[0]} asking the most questions ({gapData.topState[1].count} total)
                  </p>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span>📊</span>
                <p className="text-foreground">
                  <strong>Total Research:</strong> {gapData.totalQuestions} questions analyzed across {gapData.topicDeepDive.length} categories
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Lesson Gap Recommendations Table */}
        <Card className="bg-card border-border p-4 mb-6">
          <h3 className="text-sm font-axis uppercase text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> LESSON GAP RECOMMENDATIONS
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-2 font-medium">Priority</th>
                  <th className="p-2 font-medium">Suggested Lesson Title</th>
                  <th className="p-2 font-medium hidden md:table-cell">Category</th>
                  <th className="p-2 font-medium hidden md:table-cell">Difficulty</th>
                  <th className="p-2 font-medium">Asked</th>
                  <th className="p-2 font-medium hidden lg:table-cell">Examples</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {gapData?.recs?.map(rec => {
                  const examples = Array.isArray(rec.example_questions) ? rec.example_questions as string[] : [];
                  return (
                    <tr key={rec.id} className="border-b border-border hover:bg-primary/5">
                      <td className="p-2"><PriorityBadge score={rec.priority_score || 0} /></td>
                      <td className="p-2 text-foreground font-medium max-w-[200px]">{rec.suggested_title}</td>
                      <td className="p-2 hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px]"
                          style={{ borderColor: CATEGORY_COLORS[rec.suggested_category || "other"], color: CATEGORY_COLORS[rec.suggested_category || "other"] }}>
                          {rec.suggested_category || "—"}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground capitalize hidden md:table-cell">{rec.suggested_difficulty || "—"}</td>
                      <td className="p-2 text-foreground font-mono">{rec.question_count || 0}</td>
                      <td className="p-2 hidden lg:table-cell">
                        {examples.length > 0 && (
                          <div className="group relative">
                            <span className="text-xs text-muted-foreground cursor-help underline decoration-dotted">
                              {examples.length} example{examples.length > 1 ? "s" : ""}
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-64 p-3 rounded-lg bg-popover border border-border shadow-lg text-xs space-y-1">
                              {examples.slice(0, 3).map((ex, i) => (
                                <p key={i} className="text-foreground">"{typeof ex === 'string' ? ex.substring(0, 60) : String(ex)}"</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <Select value={rec.status || "pending"} onValueChange={(val) => updateStatus.mutate({ id: rec.id, status: val })}>
                          <SelectTrigger className="h-7 text-xs w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_development">In Development</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="dismissed">Dismissed</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                          onClick={() => navigate("/admin/lessons")}>
                          Create Lesson →
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!gapData?.recs?.length && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No lesson gap recommendations yet. Gaps will be identified as users ask questions in Ask Uwazi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Topic Deep Dive */}
        <Card className="bg-card border-border p-4">
          <h3 className="text-sm font-axis uppercase text-foreground mb-4">TOPIC DEEP DIVE</h3>
          <div className="space-y-1">
            {gapData?.topicDeepDive?.map(topic => (
              <Collapsible key={topic.topic} open={openTopics[topic.topic]}
                onOpenChange={(open) => setOpenTopics(prev => ({ ...prev, [topic.topic]: open }))}>
                <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {openTopics[topic.topic] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <Badge variant="outline" className="text-xs"
                      style={{ borderColor: CATEGORY_COLORS[topic.topic] || "#6b7280", color: CATEGORY_COLORS[topic.topic] || "#6b7280" }}>
                      {topic.topic}
                    </Badge>
                    <span className="text-sm text-foreground font-medium">{topic.count} questions</span>
                    {topic.noLesson > 0 && (
                      <span className="text-xs text-amber-400">{topic.noLesson} without lesson</span>
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-10 pb-3">
                  <div className="space-y-1.5">
                    {topic.subTopics.map(([sub, count]) => (
                      <div key={sub} className="flex items-center justify-between text-xs py-1">
                        <span className="text-muted-foreground">{sub}</span>
                        <span className="text-foreground font-mono">{count}</span>
                      </div>
                    ))}
                    {!topic.subTopics.length && <p className="text-xs text-muted-foreground">No sub-topics detected yet</p>}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
            {!gapData?.topicDeepDive?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">No topic data yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* ═══ Existing sections ═══ */}
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
