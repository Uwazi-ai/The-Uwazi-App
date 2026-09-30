import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyResearchSurveys } from "@/hooks/useResearchSurveys";

/** Home feed card for research surveys sent to this person. */
export function ResearchSurveyCard() {
  const { data } = useMyResearchSurveys();
  const s = data?.[0];
  if (!s) return null;
  return (
    <section data-testid="research-survey-card" className="rounded-[20px] border border-primary/40 bg-primary/10 p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <ClipboardList className="h-6 w-6 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Research survey</p>
        <p className="font-heading text-lg text-foreground">{s.title}</p>
        <p className="text-sm text-muted-foreground">It takes about {Math.max(1, Math.ceil(s.questions.length / 3))} minutes. You earn 15 points.</p>
      </div>
      <Button asChild><Link to={`/app/survey/${s.id}`}>Answer the survey</Link></Button>
    </section>
  );
}
