import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CompassRose } from "@/components/compass/CompassRose";
import { BudgetSliders, defaultBudget } from "@/components/compass/BudgetSliders";
import { useCompassDemo } from "@/hooks/useCompassDemo";
import { scoreAnswers } from "@/lib/compassScoring";

export default function CompassDemoPage() {
  const { eventSlug = "" } = useParams();
  const demo = useCompassDemo(eventSlug);
  const [budget, setBudget] = useState(defaultBudget);
  const { run, catalog } = demo;
  const question = catalog?.questions[run.index];
  const persona = catalog?.personas.find(p => p.slug === run.result?.labels.persona);
  const scores = run.result?.scores ?? (catalog ? scoreAnswers(catalog.questions, catalog.dimensions, run.answers) : {});
  return <main className="min-h-dvh overflow-x-hidden bg-background px-4 py-8 text-foreground"><div className="mx-auto max-w-xl space-y-6">
    <header className="flex items-center gap-3"><Compass className="size-8 text-primary" /><h1 className="font-heading text-2xl">Civic Compass</h1></header>
    {demo.status === "loading" && <p role="status">Loading Civic Compass.</p>}
    {demo.status === "inactive" && <><p>This demo is not running right now.</p><Button asChild><Link to="/app">App home</Link></Button></>}
    {demo.status === "error" && <><p role="alert">We could not load the demo. Please try again.</p><Button onClick={() => window.location.reload()}>Try again</Button></>}
    {demo.status === "ready" && catalog && <>
      <p className="text-sm text-muted-foreground">{demo.event?.label}</p>
      {run.stage === "intro" && <><div className="flex justify-center"><CompassRose scores={{}} /></div><Button className="h-12 w-full" onClick={() => demo.setRun(previous => ({ ...previous, startedAt: Date.now(), stage: "quiz" }))}>Take the Civic Compass</Button></>}
      {run.stage === "quiz" && question && <><p className="text-sm text-muted-foreground">Question {run.index + 1} of {catalog.questions.length}</p><Progress value={run.index / catalog.questions.length * 100} /><div className="flex justify-center"><CompassRose scores={scores} size={200} /></div><h2 className="text-xl font-semibold">{question.prompt_text}</h2><div className="space-y-2">{["Strongly disagree", "Disagree", "Not sure", "Agree", "Strongly agree"].map((label, index) => <Button key={label} variant="outline" className="min-h-12 w-full whitespace-normal" onClick={() => demo.setRun(previous => ({ ...previous, answers: { ...previous.answers, [question.id]: index + 1 }, index: Math.min(previous.index + 1, catalog.questions.length - 1), stage: previous.index === catalog.questions.length - 1 ? "budget" : "quiz" }))}>{label}</Button>)}</div><Button variant="ghost" disabled={run.index === 0} onClick={() => demo.setRun(previous => ({ ...previous, index: previous.index - 1 }))}>Back</Button></>}
      {run.stage === "budget" && <><BudgetSliders value={budget} onChange={setBudget} onBack={() => demo.setRun(previous => ({ ...previous, stage: "quiz" }))} onDone={() => void demo.finish()} />{demo.finishing && <p role="status">Finding your persona.</p>}{demo.error && <p role="alert">{demo.error}</p>}</>}
      {run.stage === "result" && run.result && <>
        <section className="space-y-4 text-center" aria-label="Full Compass report"><h2 className="font-heading text-3xl">{persona?.name}</h2><p>{run.result.labels.primary}</p><div className="flex justify-center"><CompassRose scores={scores} /></div><p>{persona?.one_line}</p><p className="text-muted-foreground">{persona?.archetype_intro}</p></section>
        {persona && <div className="space-y-5"><section><h3 className="font-heading text-lg">Your strength</h3><p>{persona.strength}</p></section><section><h3 className="font-heading text-lg">Another side to consider</h3><p>{persona.blind_spot}</p></section>{persona.archetype_examples && <section><h3 className="font-heading text-lg">Roles you might recognize</h3><p>{persona.archetype_examples}</p></section>}</div>}
        <section><h3 className="font-heading text-lg">Your issues</h3><ul className="space-y-2">{catalog.dimensions.map(d => <li key={d.slug} className="flex justify-between gap-4"><span>{d.name}</span><span>{Math.round((scores[d.slug] ?? 0) * 100)}%</span></li>)}</ul></section>
        {persona && <Button asChild variant="outline" className="h-12 w-full"><Link to={`/compass/persona/${persona.slug}`}>Your take-home persona</Link></Button>}
        <Button className="h-12 w-full" onClick={() => { setBudget(defaultBudget()); demo.nextStudent(); }}>Next student</Button>
      </>}
    </>}
  </div></main>;
}