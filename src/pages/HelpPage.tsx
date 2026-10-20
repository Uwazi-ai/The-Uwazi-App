import { Link } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { replayTour } from "@/lib/appTour";

const GUIDES = [
  { to: "/app", title: "Home", steps: ["Open Home from the menu.", "See your points at the top right.", "Tap your next step card to keep going.", "Scroll down for videos and voting rights."] },
  { to: "/app/ask", title: "Ask UWAZI", steps: ["Open Ask UWAZI.", "Type a question, or tap a suggested one.", "Read the answer and its sources.", "Free accounts get 10 questions a day."] },
  { to: "/app/vote", title: "Voting Hub", steps: ["Open Voting Hub.", "Use the tabs to see elections, candidates and ballot measures.", "Tap a candidate to read their profile.", "Build your voting plan so you know when and where to vote."] },
  { to: "/app/learn", title: "Learn", steps: ["Open Learn.", "Pick a track and start the first lesson.", "Finish the quiz. You need 75% to pass.", "Passing lessons earns badges and points."] },
  { to: "/app/watch", title: "Watch", steps: ["Open Watch.", "Videos play as you scroll.", "Swipe up for the next video.", "Tap a video to pause it."] },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header>
        <h1 className="font-heading text-3xl text-foreground">Help</h1>
        <p className="mt-1 text-muted-foreground">Short guides for each part of UWAZI.</p>
      </header>
      <Button className="min-h-12" onClick={replayTour}><PlayCircle />Replay the app tour</Button>
      <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-4">
        {GUIDES.map((g) => (
          <AccordionItem key={g.title} value={g.title}>
            <AccordionTrigger className="min-h-12 font-heading text-lg">{g.title}</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              <Link to={g.to} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Go to {g.title}</Link>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
