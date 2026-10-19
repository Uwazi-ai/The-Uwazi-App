import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowUpRight, BookOpen, FlaskConical, RefreshCw, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewAnalytics } from "@/components/admin/OverviewAnalytics";
import { OverviewRecentSignups, OverviewTopScores, OverviewZipBreakdown } from "@/components/admin/OverviewPeople";
import { JourneyResearchPanels } from "@/components/admin/JourneyResearchPanels";
import { ResearchSurveysPanel } from "@/components/admin/ResearchSurveysPanel";
import { PersonaCopyAdmin } from "@/components/admin/PersonaCopyAdmin";
import { CompassFactsAdmin } from "@/components/admin/CompassFactsAdmin";
import { PlatformHealthCard } from "@/components/admin/PlatformHealthCard";
import { UnverifiedActionsPanel } from "@/components/admin/UnverifiedActionsPanel";
import { useAdminStats, useSignupChart } from "@/hooks/useAdminData";
import { CompassDemoEvents } from "@/components/admin/CompassDemoEvents";

const groups = [
  { id: "people", label: "People", icon: Users, tools: [{ id: "signups", label: "Recent signups" }, { id: "scores", label: "Top civic scores" }, { id: "zip", label: "ZIP breakdown" }] },
  { id: "research", label: "Research", icon: FlaskConical, tools: [{ id: "journey", label: "Civic Journey" }, { id: "surveys", label: "Research surveys" }] },
  { id: "content", label: "Content", icon: BookOpen, tools: [{ id: "personas", label: "Persona copy" }, { id: "facts", label: "Compass facts" }, { id: "demo-events", label: "Compass Demo Events" }] },
  { id: "platform", label: "Platform", icon: Activity, tools: [{ id: "health", label: "Platform health" }, { id: "actions", label: "Unverified actions" }] },
];

export function resolveOverviewSelection(params: URLSearchParams) {
  const group = groups.find((item) => item.id === params.get("tab")) ?? groups[0];
  const tool = group.tools.find((item) => item.id === params.get("tool")) ?? group.tools[0];
  return { tab: group.id, tool: tool.id };
}

export default function AdminOverviewPage() {
  const statsQuery = useAdminStats();
  const chartQuery = useSignupChart();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [selection, setSelection] = useState(() => resolveOverviewSelection(params));
  const [dirty, setDirty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const acceptedUrl = useRef(params.toString());
  const url = params.toString();

  useEffect(() => {
    const next = resolveOverviewSelection(new URLSearchParams(url));
    if (next.tab !== selection.tab || next.tool !== selection.tool) {
      if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) {
        setParams(new URLSearchParams(acceptedUrl.current), { replace: true });
        return;
      }
      setDirty(false);
      setSelection(next);
    }
    acceptedUrl.current = url;
  }, [url, selection.tab, selection.tool, dirty, setParams]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const choose = (tab: string, tool?: string) => {
    const group = groups.find((item) => item.id === tab) ?? groups[0];
    const next = new URLSearchParams(params);
    next.set("tab", group.id);
    next.set("tool", tool ?? group.tools[0].id);
    setParams(next, { preventScrollReset: true });
  };
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        statsQuery.refetch(), chartQuery.refetch(),
        client.invalidateQueries({ predicate: (query) => ["admin-recent-signups", "admin-top-scores", "admin-zip-breakdown", "journey-research-stats", "research-survey-stats", "admin-platform-health", "admin-unverified-actions"].includes(String(query.queryKey[0])), refetchType: "active" }),
      ]);
    } finally { setRefreshing(false); }
  };
  const updatedAt = statsQuery.isSuccess && chartQuery.isSuccess ? Math.min(statsQuery.dataUpdatedAt, chartQuery.dataUpdatedAt) : 0;
  const currentGroup = groups.find((item) => item.id === selection.tab) ?? groups[0];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 overflow-x-hidden p-4 md:p-6" onClickCapture={(event) => {
      const target = event.target;
      if (dirty && target instanceof Element && target.closest("a[href]") && !window.confirm("You have unsaved changes. Leave without saving?")) {
        event.preventDefault(); event.stopPropagation();
      }
    }}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Shield className="h-4 w-4" />UWAZI Admin</div>
          <h1 className="font-axis text-3xl text-foreground">Admin overview</h1>
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{updatedAt ? `Analytics updated ${new Date(updatedAt).toLocaleTimeString()}` : "Analytics not yet updated"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing || statsQuery.isFetching || chartQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "motion-safe:animate-spin" : ""}`} />Refresh</Button>
          <Button asChild size="sm"><Link to="/app/admin/analytics">Open full analytics<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </header>
      <OverviewAnalytics statsQuery={statsQuery} chartQuery={chartQuery} />
      <section aria-label="Admin tools" className="border-t border-border pt-5">
        <Tabs value={selection.tab} onValueChange={(tab) => choose(tab)} activationMode="manual">
          <TabsList aria-label="Admin sections" className="grid h-auto w-full grid-cols-4 gap-1 bg-muted p-1 md:w-fit">
            {groups.map((group) => <TabsTrigger key={group.id} value={group.id} className="min-w-0 gap-2 px-2 py-2.5 md:px-5 data-[state=active]:text-primary"><group.icon className="hidden h-4 w-4 shrink-0 sm:block" />{group.label}</TabsTrigger>)}
          </TabsList>
          {groups.map((group) => <TabsContent key={group.id} value={group.id} className="mt-4 space-y-4">
            {selection.tab === group.id && <>
              <div className="flex flex-wrap gap-2" role="group" aria-label={`${currentGroup.label} tools`}>
                {group.tools.map((tool) => <Button key={tool.id} variant={selection.tool === tool.id ? "secondary" : "ghost"} size="sm" aria-pressed={selection.tool === tool.id} onClick={() => choose(group.id, tool.id)} className={selection.tool === tool.id ? "text-primary" : "text-muted-foreground"}>{tool.label}</Button>)}
              </div>
              <div key={selection.tool} data-testid="overview-tool">
                {selection.tool === "signups" && <OverviewRecentSignups />}
                {selection.tool === "scores" && <OverviewTopScores />}
                {selection.tool === "zip" && <OverviewZipBreakdown />}
                {selection.tool === "journey" && <JourneyResearchPanels />}
                {selection.tool === "surveys" && <ResearchSurveysPanel showLink />}
                {selection.tool === "personas" && <PersonaCopyAdmin onDirtyChange={setDirty} />}
                {selection.tool === "facts" && <CompassFactsAdmin onDirtyChange={setDirty} />}
                {selection.tool === "demo-events" && <CompassDemoEvents onDirtyChange={setDirty} />}
                {selection.tool === "health" && <PlatformHealthCard />}
                {selection.tool === "actions" && <UnverifiedActionsPanel />}
              </div>
            </>}
          </TabsContent>)}
        </Tabs>
      </section>
    </div>
  );
}
