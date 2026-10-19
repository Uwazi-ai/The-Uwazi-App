import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { MotionConfig } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CompassRose } from "@/components/compass/CompassRose";
import { BudgetSliders, defaultBudget } from "@/components/compass/BudgetSliders";
import { SwipeCard } from "@/components/compass/SwipeCard";
import { CompassKiosk, PersonaReveal, PersonaQR, kioskCopy } from "@/components/compass/CompassKiosk";
import { useCompassDemo } from "@/hooks/useCompassDemo";
import { useCompassKioskIdle } from "@/hooks/useCompassKioskIdle";
import { scoreAnswers } from "@/lib/compassScoring";

export default function CompassDemoPage() {
  const { eventSlug = "" } = useParams();
  const demo = useCompassDemo(eventSlug);
  const [budget, setBudget] = useState(defaultBudget);
  const heading = useRef<HTMLDivElement | null>(null);
  const { run, catalog } = demo;
  const question = catalog?.questions[run.index];
  const persona = catalog?.personas.find(p => p.slug === run.result?.labels.persona);
  const scores = run.result?.scores ?? (catalog ? scoreAnswers(catalog.questions, catalog.dimensions, run.answers) : {});
  const nextStudent = useCallback(() => { setBudget(defaultBudget()); demo.nextStudent(); window.scrollTo(0, 0); }, [demo.nextStudent]);
  const countdown = useCompassKioskIdle(demo.status === "ready" ? run.stage : "intro", nextStudent);
  useEffect(() => { window.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }); }, [run.stage, run.index]);
  const answer = (value: number) => {
    if (!question) return;
    demo.setRun(previous => previous.stage !== "quiz" || catalog?.questions[previous.index]?.id !== question.id ? previous : ({ ...previous, answers: { ...previous.answers, [question.id]: value }, index: Math.min(previous.index + 1, catalog.questions.length - 1), stage: previous.index === catalog.questions.length - 1 ? "budget" : "quiz" }));
  };
  return <MotionConfig reducedMotion="user"><CompassKiosk>
    <div ref={heading} tabIndex={-1} className="flex flex-1 flex-col outline-none">
      {demo.status === "loading" && <p role="status">Loading Civic Compass.</p>}
      {demo.status === "inactive" && <p>This demo is not running right now.</p>}
      {demo.status === "error" && <div className="space-y-5"><p role="alert">We could not load the demo. Please try again.</p><Button className="h-14" onClick={() => window.location.reload()}>Try again</Button></div>}
      {demo.status === "ready" && catalog && <>
        {run.stage === "intro" && <section className="flex flex-1 flex-col justify-center gap-7 py-6 text-center"><p className="text-sm text-primary">{kioskCopy(demo.event?.label)}</p><div className="flex justify-center"><CompassRose scores={{}} size={240} /></div><h1 className="font-heading text-4xl leading-tight">Find your civic persona.</h1><p className="text-lg leading-relaxed">Answer a few quick questions. No sign-up. We don't save your name.</p><p className="leading-relaxed text-muted-foreground">This is not about political parties. It's about how you show up for your community.</p><Button className="h-14 w-full text-lg" onClick={() => demo.setRun(previous => ({ ...previous, startedAt: Date.now(), stage: "quiz" }))}>Start<ArrowRight className="ml-2 size-5" /></Button></section>}
        {run.stage === "quiz" && question && <section className="space-y-5"><div className="flex items-center justify-between gap-3"><Button variant="ghost" className="h-14 px-3" onClick={() => run.index === 0 ? nextStudent() : demo.setRun(previous => ({ ...previous, index: previous.index - 1 }))}><ArrowLeft className="mr-2 size-5" />Back</Button><p className="text-sm text-muted-foreground" aria-live="polite">Question {run.index + 1} of {catalog.questions.length}</p></div><Progress aria-label="Quiz progress" value={(run.index + 1) / catalog.questions.length * 100} className="h-2" /><SwipeCard key={question.id} text={kioskCopy(question.prompt_text)} onAnswer={answer} /><div className="space-y-3">{["Strongly disagree", "Disagree", "Not sure", "Agree", "Strongly agree"].map((label, index) => <Button key={label} variant={run.answers[question.id] === index + 1 ? "default" : "outline"} className="min-h-14 w-full justify-start px-5 text-base" aria-pressed={run.answers[question.id] === index + 1} onClick={() => answer(index + 1)}>{label}</Button>)}</div></section>}
        {run.stage === "budget" && <section className="space-y-5"><BudgetSliders value={budget} onChange={setBudget} onBack={() => demo.setRun(previous => ({ ...previous, stage: "quiz" }))} onDone={() => void demo.finish()} />{demo.finishing && <p role="status">Finding your persona.</p>}{demo.error && <p role="alert">{demo.error}</p>}</section>}
        {run.stage === "result" && run.result && persona && <section className="space-y-8 pb-4" aria-label="Your persona results"><PersonaReveal persona={persona} scores={scores} /><section className="space-y-3"><h2 className="font-heading text-xl">How you show up</h2><p className="leading-relaxed">{kioskCopy(persona.archetype_intro)}</p><p className="leading-relaxed text-muted-foreground">{kioskCopy(persona.archetype_examples)}</p></section><section className="space-y-4"><h2 className="font-heading text-xl">Your top issues</h2>{run.result.top.length ? <ul className="divide-y divide-border">{run.result.top.map(slug => <li key={slug} className="flex items-center justify-between gap-4 py-3"><span>{kioskCopy(catalog.dimensions.find(d => d.slug === slug)?.name)}</span><span className="font-semibold text-primary">{Math.round((scores[slug] ?? 0) * 100)}%</span></li>)}</ul> : <p>You care about many issues about the same.</p>}</section><section className="space-y-3"><h2 className="font-heading text-xl">Your values</h2><p className="leading-relaxed">{kioskCopy(run.result.labels.primary)}</p><p className="leading-relaxed text-muted-foreground">{kioskCopy(persona.strength)}</p></section><PersonaQR personaKey={persona.slug} /><p className="text-center text-muted-foreground">Questions? Ask us at the table.</p><div className="sticky bottom-0 bg-background py-3"><Button className="h-16 w-full text-lg" onClick={nextStudent}>Next student<ArrowRight className="ml-2 size-5" /></Button></div></section>}
      </>}
    </div>
    <DialogPrimitive.Root open={countdown !== null} onOpenChange={() => {}}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/90" /><DialogPrimitive.Content data-compass-kiosk className="fixed left-1/2 top-1/2 z-50 w-[calc(100%_-_40px)] max-w-sm -translate-x-1/2 -translate-y-1/2 space-y-5 rounded-lg border border-border bg-card p-7 text-center text-foreground" onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => event.preventDefault()}><DialogPrimitive.Title className="font-heading text-2xl">Still there?</DialogPrimitive.Title><DialogPrimitive.Description className="text-muted-foreground" aria-live="polite">Starting fresh in {countdown} seconds.</DialogPrimitive.Description><Button className="h-14 w-full" onClick={() => window.dispatchEvent(new Event("input"))}>I'm here</Button></DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>
  </CompassKiosk></MotionConfig>;
}