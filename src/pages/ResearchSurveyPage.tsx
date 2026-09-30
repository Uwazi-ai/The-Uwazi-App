import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useMyResearchSurveys, type SurveyQuestion } from "@/hooks/useResearchSurveys";

type Answers = Record<string, string | string[] | number>;

function Question({ q, value, onChange }: { q: SurveyQuestion; value: Answers[string] | undefined; onChange: (v: Answers[string]) => void }) {
  const opts = q.options ?? [];
  const pill = (on: boolean) => `px-3 py-2 rounded-full border text-sm text-left transition-colors ${on ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`;
  return (
    <fieldset className="space-y-3">
      <legend className="font-medium text-foreground">{q.prompt}</legend>
      {q.type === "single_choice" && (
        <div className="flex flex-wrap gap-2">{opts.map((o) => <button type="button" key={o} className={pill(value === o)} onClick={() => onChange(o)}>{o}</button>)}</div>
      )}
      {q.type === "multi_choice" && (
        <div className="flex flex-wrap gap-2">{opts.map((o) => {
          const arr = Array.isArray(value) ? value : [];
          const on = arr.includes(o);
          return <button type="button" key={o} aria-pressed={on} className={pill(on)} onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}>{o}</button>;
        })}</div>
      )}
      {q.type === "scale" && (
        <div className="space-y-1">
          <div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={`${pill(value === n)} w-11 text-center`} onClick={() => onChange(n)}>{n}</button>)}</div>
          <p className="text-xs text-muted-foreground">1 means not at all. 5 means a lot.</p>
        </div>
      )}
      {q.type === "short_text" && (
        <Textarea maxLength={500} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Write a short answer" />
      )}
    </fieldset>
  );
}

export default function ResearchSurveyPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useMyResearchSurveys();
  const [answers, setAnswers] = useState<Answers>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  if (done !== null) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center space-y-4" data-testid="survey-done">
        <h1 className="font-heading text-3xl text-foreground">Thank you</h1>
        <p className="text-foreground">Your answers are saved. They are counted with others. Your name is never shown next to them.</p>
        {done > 0 && <p className="inline-block rounded-full bg-primary/15 text-primary font-bold px-3 py-1">+{done} points</p>}
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild><Link to="/app/progress">See my next step</Link></Button>
          <Button asChild variant="outline"><Link to={`/app/ask?q=${encodeURIComponent("What can I do next for my city?")}`}><MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI</Link></Button>
        </div>
      </div>
    );
  }
  if (isLoading) return <LoadingScreen fullScreen={false} />;
  const s = data?.find((x) => x.id === id);
  if (!s) return <Navigate to="/app" replace />;

  const submit = async () => {
    setBusy(true);
    const clean: Answers = {};
    for (const [k, v] of Object.entries(answers)) {
      if (typeof v === "string" && !v.trim()) continue;
      if (Array.isArray(v) && !v.length) continue;
      clean[k] = typeof v === "string" ? v.trim() : v;
    }
    const { data: pts, error } = await (supabase as any).rpc("submit_research_survey", { _survey_id: s.id, _answers: clean });
    setBusy(false);
    if (error) return toast.error("We could not save your answers. Try again.");
    qc.invalidateQueries({ queryKey: ["my-research-surveys"] });
    qc.invalidateQueries({ queryKey: ["my-journey"] });
    setDone(pts ?? 0);
  };

  const answered = Object.keys(answers).length;
  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6" data-testid="research-survey">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Research survey</p>
        <h1 className="font-heading text-3xl text-foreground">{s.title}</h1>
        {s.intro && <p className="text-muted-foreground">{s.intro}</p>}
        <p className="text-xs text-muted-foreground">You can skip any question. Your name is never shown next to your answers.</p>
      </div>
      {s.questions.map((q) => <Question key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />)}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || answered === 0} onClick={submit}>Send my answers, +15 points</Button>
        <Button asChild variant="outline"><Link to={`/app/ask?q=${encodeURIComponent("Why does UWAZI ask research questions?")}`}><MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI about this</Link></Button>
      </div>
    </div>
  );
}
