import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PersonaBadge } from "@/components/compass/PersonaBadge";

const db = supabase as any;
const STEP_NAMES: Record<string, string> = {
  compass: "Take the Compass quiz", survey: "Answer a survey", lesson: "Do a lesson",
  office_action: "Reach out to an office", my_city: "Explore My City",
};

function Bar({ label, value, max, note }: { label: string; value: number; max: number; note?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm"><span className="text-foreground">{label}</span><span className="text-muted-foreground">{note ?? value}</span></div>
      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

const rate = (c: number, n: number) => (n ? `${Math.round((c / n) * 100)}%, ${c} of ${n}` : "No data yet");

export function JourneyResearchPanels() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["journey-research-stats"],
    queryFn: async () => {
      const { data, error } = await db.rpc("journey_research_stats");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="h-40 rounded-xl bg-card animate-pulse" />;
  if (error || !data) return <p className="text-sm text-destructive">We could not load the journey numbers. Refresh the page to try again.</p>;

  const personas = data.personas ?? [];
  const idMax = Math.max(1, ...personas.map((i: any) => i.count));
  const stMax = Math.max(1, ...data.stages.map((s: any) => s.count));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-axis uppercase text-foreground">Civic Journey</h2>
        <p className="text-sm text-muted-foreground">Only people who said yes to research are counted. That is {data.research_users} people right now.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Civic personas</h3>
          {personas.length ? personas.map((i: any) => (
            <div key={i.slug} className="flex items-center gap-2">
              {i.slug !== "none" && <PersonaBadge slug={i.slug} size="chip" className="h-7 w-7 shrink-0" label="" />}
              <div className="flex-1"><Bar label={i.label} value={i.count} max={idMax} /></div>
            </div>))
            : <p className="text-sm text-muted-foreground">No one yet.</p>}
          <p className="text-xs text-muted-foreground" data-testid="persona-changed">{data.persona_changed_30d ?? 0} people got a different persona on a new quiz in the last 30 days.</p>
        </Card>
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Stages</h3>
          {data.stages.map((s: any) => <Bar key={s.stage} label={s.stage} value={s.count} max={stMax} note={`${s.count} now, ${s.moved_in} new in 30 days`} />)}
          <p className="text-xs text-muted-foreground">{data.moved_up_30d} people moved up a stage in the last 30 days.</p>
        </Card>
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Next steps done</h3>
          {data.next_steps.length ? data.next_steps.map((s: any) => (
            <Bar key={s.type} label={STEP_NAMES[s.type] ?? s.type} value={s.completed} max={s.set} note={rate(s.completed, s.set)} />
          )) : <p className="text-sm text-muted-foreground">No next steps yet.</p>}
        </Card>
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Your path lessons done by issue</h3>
          {data.path_by_dimension.length ? data.path_by_dimension.map((d: any) => (
            <Bar key={d.dimension} label={d.dimension} value={d.completed} max={d.offered} note={rate(d.completed, d.offered)} />
          )) : <p className="text-sm text-muted-foreground">No path lessons shown yet.</p>}
        </Card>
      </div>
    </section>
  );
}
