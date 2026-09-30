import type { MyJourney } from "@/hooks/useJourney";
export function stepInfo(step: MyJourney["next_step"]): { title: string; sub: string; to: string | null; action?: "civic"; cta: string } {
  if (!step) return { title: "Explore My City", sub: "See what is happening near you.", to: "/app/my-city", cta: "Explore My City" };
  switch (step.type) {
    case "compass": return { title: "Take the Civic Compass quiz", sub: "It takes about 3 minutes. You earn 50 points.", to: "/app/compass", cta: "Take the quiz, +50 points" };
    case "survey": return { title: step.title ? `Answer: ${step.title}` : "Answer a short survey", sub: "Your voice helps your community. You earn 15 points.", to: step.ref ? `/app/survey/${step.ref}` : "/app", cta: "Answer the survey, +15 points" };
    case "lesson": return { title: step.title ? `Start: ${step.title}` : "Start your next lesson", sub: "A short lesson. You earn 25 points.", to: `/app/learn?lesson=${step.ref}`, cta: "Start the lesson, +25 points" };
    case "office_action": return { title: step.title ? `Reach out to ${step.title}` : "Reach out to a local leader", sub: "Call, email, or go to a meeting. Then tap below. You earn 30 points.", to: null, action: "civic", cta: "I took action, +30 points" };
    default: return { title: "Explore My City", sub: "See what is happening near you.", to: "/app/my-city", cta: "Explore My City" };
  }
}
