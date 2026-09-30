import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

/** Research panel: answers per survey and the share of people who answered. */
export function ResearchSurveysPanel({ showLink = false }: { showLink?: boolean }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["research-survey-stats"],
    queryFn: async () => { const { data, error } = await (supabase as any).rpc("research_survey_stats"); if (error) throw error; return data ?? []; },
  });
  return (
    <Card className="p-5 space-y-3" data-testid="research-panel">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">Research</h3>
        {showLink && <Link to="/app/admin/research-surveys" className="text-sm text-primary underline">Open research surveys</Link>}
      </div>
      {isLoading ? <div className="h-10 rounded bg-muted animate-pulse" /> : data.length ? data.map((s: any) => {
        const pct = s.sent ? Math.round((s.responses / s.sent) * 100) : 0;
        return (
          <div key={s.id} className="space-y-1">
            <div className="flex justify-between text-sm gap-2"><span className="text-foreground truncate">{s.title}</span>
              <span className="text-muted-foreground shrink-0">{s.responses} answers, {s.sent ? `${pct}% of ${s.sent}` : "not sent yet"}</span></div>
            <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
          </div>
        );
      }) : <p className="text-sm text-muted-foreground">No research surveys yet.</p>}
    </Card>
  );
}
